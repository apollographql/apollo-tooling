import { join, resolve } from "path";
import { readFileSync } from "fs";
import {
  window,
  workspace,
  ExtensionContext,
  Uri,
  ProgressLocation,
  DecorationOptions,
  commands,
  QuickPickItem
} from "vscode";
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind
} from "vscode-languageclient";
import { getIdFromKey } from "apollo/lib/engine";
import StatusBar from "./statusBar";

// Parse the .env file and load the ENGINE_API_KEY into process.env
const env: { [key: string]: string } = workspace.rootPath
  ? require("dotenv").parse(readFileSync(resolve(workspace.rootPath, ".env")))
  : {};

const key = "ENGINE_API_KEY";
if (env[key]) {
  process.env[key] = env[key];
}

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(join("server", "server.js"));
  const debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };
  const statusBar = new StatusBar();
  let schemaTags: QuickPickItem[] = [];

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

  const client = new LanguageClient(
    "apollographql",
    "Apollo GraphQL",
    serverOptions,
    clientOptions
  );
  client.registerProposedFeatures();
  context.subscriptions.push(client.start());

  client.onReady().then(() => {
    // For some reason, non-strings can only be sent in one direction. For now, messages
    // coming from the language server just need to be stringified and parsed.
    client.onNotification(
      "apollographql/tagsLoaded",
      (stringifiedTags: string) => {
        const parsedTags: [string, string[]][] =
          JSON.parse(stringifiedTags) || [];

        const quickPickItems = parsedTags.reduce(
          (flattenedTags: QuickPickItem[], [serviceId, tags]) => [
            ...flattenedTags,
            ...tags.map(tag => ({
              label: tag,
              description: "",
              detail: getIdFromKey(serviceId)
            }))
          ],
          []
        );

        schemaTags = [...quickPickItems, ...schemaTags];
        statusBar.enableClickHandler(true);
      }
    );

    commands.registerCommand("launchSchemaTagPicker", async () => {
      const selection = await window.showQuickPick(schemaTags);
      if (selection) {
        client.sendNotification("apollographql/tagSelected", selection);
      }
    });

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
