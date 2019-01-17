import { join } from "path";
import {
  window,
  workspace,
  ExtensionContext,
  Uri,
  ProgressLocation,
  DecorationOptions,
  commands,
  QuickPickItem,
  Disposable,
  OutputChannel
} from "vscode";
import StatusBar from "./statusBar";
import { getLanguageServerClient } from "./languageServerClient";
import { LanguageClient } from "vscode-languageclient";
import {
  printNoFileOpenMessage,
  printStatsToClientOutputChannel
} from "./utils";

const { version } = require("./package.json");

let client: LanguageClient;
let clientDisposable: Disposable;
let statusBar: StatusBar;
let outputChannel: OutputChannel;
let schemaTagItems: QuickPickItem[] = [];

export function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    join("node_modules/apollo-language-server/lib", "server.js")
  );

  // Initialize language client
  client = getLanguageServerClient(serverModule, outputChannel);
  client.registerProposedFeatures();

  // Initialize disposables
  statusBar = new StatusBar({
    hasActiveTextEditor: Boolean(window.activeTextEditor)
  });
  outputChannel = window.createOutputChannel("Apollo GraphQL");
  clientDisposable = client.start();

  // Handoff disposables for cleanup
  context.subscriptions.push(statusBar, outputChannel, clientDisposable);

  // Once client is ready, we can send messages and add listeners for various notifications
  client.onReady().then(() => {
    commands.registerCommand("apollographql/showStats", () => {
      const fileUri = window.activeTextEditor
        ? window.activeTextEditor.document.uri.fsPath
        : null;

      // if no editor is open, but an output channel is, vscode returns something like
      // output:extension-output-%234. If an editor IS open, this is something like file://Users/...
      // This check is just for either a / or a \ anywhere in a fileUri
      const fileOpen = fileUri && /[\/\\]/.test(fileUri);

      if (fileOpen) {
        client.sendNotification("apollographql/getStats", { uri: fileUri });
        return;
      }
      printNoFileOpenMessage(client, version);
      client.outputChannel.show();
    });

    client.onNotification("apollographql/statsLoaded", params => {
      printStatsToClientOutputChannel(client, params, version);
      client.outputChannel.show();
    });

    commands.registerCommand("apollographql/reloadService", () => {
      // wipe out tags when reloading
      // XXX we should clean up this handling
      schemaTagItems = [];
      client.sendNotification("apollographql/reloadService");
    });

    // For some reason, non-strings can only be sent in one direction. For now, messages
    // coming from the language server just need to be stringified and parsed.
    client.onNotification("apollographql/tagsLoaded", params => {
      const [serviceID, tags]: [string, string[]] = JSON.parse(params);
      const items = tags.map(tag => ({
        label: tag,
        description: "",
        detail: serviceID
      }));

      schemaTagItems = [...items, ...schemaTagItems];
    });

    commands.registerCommand("apollographql/selectSchemaTag", async () => {
      const selection = await window.showQuickPick(schemaTagItems);
      if (selection) {
        client.sendNotification("apollographql/tagSelected", selection);
      }
    });

    let currentLoadingResolve: Map<number, () => void> = new Map();

    client.onNotification("apollographql/loadingComplete", token => {
      statusBar.showLoadedState({
        hasActiveTextEditor: Boolean(window.activeTextEditor)
      });
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
                  contentText: `${dec.message}`,
                  textDecoration: "none; padding-left: 15px; opacity: .5"
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

export function deactivate(): Thenable<void> | void {
  if (client) {
    return client.stop();
  }
}
