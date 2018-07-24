import * as path from "path";

import { workspace, ExtensionContext, WebviewPanel } from "vscode";
import * as vscode from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from "vscode-languageclient";

function sideViewColumn() {
  if (!vscode.window.activeTextEditor) {
    return vscode.ViewColumn.One;
  }

  switch (vscode.window.activeTextEditor.viewColumn) {
    case vscode.ViewColumn.One:
      return vscode.ViewColumn.Two;
    case vscode.ViewColumn.Two:
      return vscode.ViewColumn.Three;
    default:
      return vscode.window.activeTextEditor.viewColumn!;
  }
}

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(path.join("server", "server.js"));
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      "graphql",
      "javascript",
      "typescript",
      "javascriptreact",
      "typescriptreact"
    ],
    synchronize: {
      fileEvents: [
        workspace.createFileSystemWatcher("**/apollo.config.js"),
        workspace.createFileSystemWatcher("**/package.json"),
        workspace.createFileSystemWatcher("**/*.{graphql,js,ts,jsx,tsx}")
      ]
    }
  };

  let currentPanel: WebviewPanel | undefined = undefined;
  let currentCancellationID: number | undefined = undefined;

  const client = new LanguageClient(
    "apollographql",
    "Apollo GraphQL",
    serverOptions,
    clientOptions
  );
  client.registerProposedFeatures();
  context.subscriptions.push(client.start());

  const getApolloPanel = () => {
    if (currentPanel) {
      if (!currentPanel.visible) {
        // If we already have a panel, show it in the target column
        currentPanel.reveal(sideViewColumn());
      }

      return currentPanel;
    } else {
      // Otherwise, create a new panel
      currentPanel = vscode.window.createWebviewPanel(
        "apolloPanel",
        "",
        sideViewColumn(),
        {
          enableScripts: true,
          localResourceRoots: [
            vscode.Uri.file(path.join(context.extensionPath, "webview-content"))
          ]
        }
      );

      // Reset when the current panel is closed
      currentPanel.onDidDispose(
        () => {
          currentPanel = undefined;

          if (currentCancellationID) {
            client.sendNotification("apollographql/cancelQuery", {
              cancellationID: currentCancellationID
            });

            currentCancellationID = undefined;
          }
        },
        null,
        context.subscriptions
      );

      return currentPanel;
    }
  };

  client.onReady().then(() => {
    client.onNotification(
      "apollographql/requestVariables",
      ({ query, endpoint, headers, requestedVariables }) => {
        getApolloPanel().title = "GraphQL Query Variables";

        if (currentCancellationID) {
          client.sendNotification("apollographql/cancelQuery", {
            cancellationID: currentCancellationID
          });

          currentCancellationID = undefined;
        }

        const cancelReceive = currentPanel!.webview.onDidReceiveMessage(
          variables => {
            cancelReceive.dispose();
            client.sendNotification("apollographql/runQueryWithVariables", {
              query,
              endpoint,
              headers,
              variables: JSON.parse(variables)
            });
          },
          undefined,
          context.subscriptions
        );

        const baseVariables: { [key: string]: any } = {};
        (requestedVariables as string[]).forEach(v => {
          baseVariables[v] = null;
        });

        const mediaPath =
          vscode.Uri.file(path.join(context.extensionPath, "webview-content"))
            .with({
              scheme: "vscode-resource"
            })
            .toString() + "/";

        currentPanel!.webview.html = `
      <html>
        <body>
          <textarea id="variables" style="width: 100%">${JSON.stringify(
            baseVariables,
            null,
            2
          )}</textarea>
          <div>
            <button id="submit">Submit!</button>
          </div>
          <base href="${mediaPath}">
          <script src="variables-input.js"></script>
        </body>
      </html>
      `;
      }
    );

    client.onNotification(
      "apollographql/queryResult",
      ({ data, errors, cancellationID }) => {
        getApolloPanel().title = "GraphQL Query Result";

        if (currentCancellationID !== cancellationID) {
          if (currentCancellationID) {
            client.sendNotification("apollographql/cancelQuery", {
              cancellationID: currentCancellationID
            });
          }

          currentCancellationID = cancellationID;
        }

        const htmlBody = data
          ? JSON.stringify(data, null, 2)
          : errors.map((e: any) => e.message).join("\n");

        currentPanel!.webview.html = `<html><body><pre>${htmlBody}</pre></body></html>`;
      }
    );

    const engineDecoration = vscode.window.createTextEditorDecorationType({});
    let latestDecs: any[] | undefined = undefined;

    const updateDecorations = () => {
      if (vscode.window.activeTextEditor && latestDecs) {
        const editor = vscode.window.activeTextEditor!;
        const decorations: vscode.DecorationOptions[] = latestDecs
          .filter(
            d =>
              d.document ===
              vscode.window.activeTextEditor!.document.uri.toString()
          )
          .map(dec => {
            return {
              range: editor.document.lineAt(dec.range.start.line).range,
              renderOptions: {
                after: {
                  contentText: `# ${dec.message}`,
                  textDecoration: "none; padding-left: 15px; opacity: 0.5"
                }
              }
            };
          });

        vscode.window.activeTextEditor!.setDecorations(
          engineDecoration,
          decorations
        );
      }
    };

    client.onNotification("apollographql/engineDecorations", (...decs) => {
      latestDecs = decs;
      updateDecorations();
    });

    vscode.window.onDidChangeActiveTextEditor(() => {
      updateDecorations();
    });
  });
}
