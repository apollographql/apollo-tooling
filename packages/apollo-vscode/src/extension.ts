import { join } from "path";
import {
  window,
  workspace,
  ExtensionContext,
  ViewColumn,
  WebviewPanel,
  Uri,
  ProgressLocation,
  DecorationOptions
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from "vscode-languageclient";
import StatusBar from "./StatusBar";

function sideViewColumn() {
  if (!window.activeTextEditor) {
    return ViewColumn.One;
  }

  switch (window.activeTextEditor.viewColumn) {
    case ViewColumn.One:
      return ViewColumn.Two;
    case ViewColumn.Two:
      return ViewColumn.Three;
    default:
      return window.activeTextEditor.viewColumn!;
  }
}

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(join("server", "server.js"));
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
  let currentMessageHandler: ((msg: any) => void) | undefined = undefined;
  const statusBar = new StatusBar();

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
      currentPanel = window.createWebviewPanel(
        "apolloPanel",
        "",
        sideViewColumn(),
        {
          enableScripts: true,
          localResourceRoots: [
            Uri.file(join(context.extensionPath, "webview-content"))
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

      currentPanel!.webview.onDidReceiveMessage(
        message => {
          if (currentMessageHandler) {
            currentMessageHandler(message);
          }
        },
        undefined,
        context.subscriptions
      );

      currentPanel!.onDidDispose(() => {
        currentMessageHandler = undefined;
      });

      return currentPanel;
    }
  };

  client.onReady().then(() => {
    let currentLoadingResolve: Map<number, () => void> = new Map();

    client.onNotification("apollographql/loadingComplete", token => {
      statusBar.showLoadedState();
      const inMap = currentLoadingResolve.get(token);
      if (inMap) {
        inMap();
        currentLoadingResolve.delete(token);
      }
    });

    client.onNotification("apollographql/loading", ({ message, token }) => {
      window.withProgress(
        {
          location: ProgressLocation.Notification,
          title: message,
          cancellable: false
        },
        () => {
          return new Promise(resolve => {
            currentLoadingResolve.set(token, resolve);
          });
        }
      );
    });

    client.onNotification(
      "apollographql/requestVariables",
      ({ query, endpoint, headers, requestedVariables, schema }) => {
        getApolloPanel().title = "GraphQL Query Variables";

        if (currentCancellationID) {
          client.sendNotification("apollographql/cancelQuery", {
            cancellationID: currentCancellationID
          });

          currentCancellationID = undefined;
        }

        currentMessageHandler = message => {
          switch (message.type) {
            case "started":
              currentPanel!.webview.postMessage({
                type: "setMode",
                content: {
                  type: "VariablesInput",
                  requestedVariables: requestedVariables,
                  schema: schema
                }
              });
              break;

            case "variables":
              client.sendNotification("apollographql/runQueryWithVariables", {
                query,
                endpoint,
                headers,
                variables: message.content
              });

              currentMessageHandler = undefined;
              break;
          }
        };

        const mediaPath =
          Uri.file(join(context.extensionPath, "webview-content"))
            .with({
              scheme: "vscode-resource"
            })
            .toString() + "/";

        currentMessageHandler({ type: "started" });
        currentPanel!.webview.html = `
          <html>
            <body>
              <div id="root"></div>
              <base href="${mediaPath}">
              <script src="webview.bundle.js"></script>
            </body>
          </html>
        `;
      }
    );

    client.onNotification(
      "apollographql/queryResult",
      ({ result, cancellationID }) => {
        getApolloPanel().title = "GraphQL Query Result";

        if (currentCancellationID !== cancellationID) {
          if (currentCancellationID) {
            client.sendNotification("apollographql/cancelQuery", {
              cancellationID: currentCancellationID
            });
          }

          currentCancellationID = cancellationID;
        }

        currentMessageHandler = message => {
          switch (message.type) {
            case "started":
              currentPanel!.webview.postMessage({
                type: "setMode",
                content: {
                  type: "ResultViewer",
                  result
                }
              });

              currentMessageHandler = undefined;

              break;
          }
        };

        const mediaPath =
          Uri.file(join(context.extensionPath, "webview-content"))
            .with({
              scheme: "vscode-resource"
            })
            .toString() + "/";

        currentMessageHandler({ type: "started" });
        currentPanel!.webview.html = `
          <html>
            <body>
              <div id="root"></div>
              <base href="${mediaPath}">
              <script src="webview.bundle.js"></script>
            </body>
          </html>
        `;
      }
    );

    const engineDecoration = window.createTextEditorDecorationType({});
    let latestDecs: any[] | undefined = undefined;

    const updateDecorations = () => {
      if (window.activeTextEditor && latestDecs) {
        const editor = window.activeTextEditor!;
        const decorations: DecorationOptions[] = latestDecs
          .filter(
            d => d.document === window.activeTextEditor!.document.uri.toString()
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

        window.activeTextEditor!.setDecorations(engineDecoration, decorations);
      }
    };

    client.onNotification("apollographql/engineDecorations", (...decs) => {
      latestDecs = decs;
      updateDecorations();
    });

    window.onDidChangeActiveTextEditor(() => {
      updateDecorations();
    });

    workspace.registerTextDocumentContentProvider("graphql-schema", {
      provideTextDocumentContent(uri: Uri) {
        // the schema source is provided inside the URI, just return that here
        return uri.query;
      }
    });
  });
}
