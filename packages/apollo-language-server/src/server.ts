import "apollo-env";
// FIXME: The global fetch dependency comes from `apollo-link-http` and should be removed there.
import "apollo-env/lib/fetch/global";
import {
  createConnection,
  ProposedFeatures,
  FileChangeType,
  ServerCapabilities,
  TextDocuments,
  TextDocumentSyncKind,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { QuickPickItem } from "vscode";
import { GraphQLWorkspace } from "./workspace";
import { GraphQLLanguageProvider } from "./languageProvider";
import { LanguageServerLoadingHandler } from "./loadingHandler";
import { debounceHandler, Debug } from "./utilities";

const connection = createConnection(ProposedFeatures.all);
Debug.SetConnection(connection);

let hasWorkspaceFolderCapability = false;

// Awaitable promise for sending messages before the connection is initialized
let initializeConnection: () => void;
const whenConnectionInitialized: Promise<void> = new Promise(
  (resolve) => (initializeConnection = resolve)
);

const workspace = new GraphQLWorkspace(
  new LanguageServerLoadingHandler(connection),
  {
    clientIdentity: {
      name: process.env["APOLLO_CLIENT_NAME"],
      version: process.env["APOLLO_CLIENT_VERSION"],
      referenceID: process.env["APOLLO_CLIENT_REFERENCE_ID"],
    },
  }
);

workspace.onDiagnostics((params) => {
  connection.sendDiagnostics(params);
});

workspace.onDecorations((params) => {
  connection.sendNotification("apollographql/engineDecorations", params);
});

workspace.onSchemaTags((params) => {
  connection.sendNotification(
    "apollographql/tagsLoaded",
    JSON.stringify(params)
  );
});

workspace.onConfigFilesFound(async (params) => {
  await whenConnectionInitialized;

  connection.sendNotification(
    "apollographql/configFilesFound",
    params instanceof Error
      ? // Can't stringify Errors, just results in "{}"
        JSON.stringify({ message: params.message, stack: params.stack })
      : JSON.stringify(params)
  );
});

connection.onInitialize(async ({ capabilities, workspaceFolders }) => {
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && capabilities.workspace.workspaceFolders
  );

  if (workspaceFolders) {
    // We wait until all projects are added, because after `initialize` returns we can get additional requests
    // like `textDocument/codeLens`, and that way these can await `GraphQLProject#whenReady` to make sure
    // we provide them eventually.
    await Promise.all(
      workspaceFolders.map((folder) => workspace.addProjectsInFolder(folder))
    );
  }

  return {
    capabilities: {
      hoverProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ["...", "@"],
      },
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeLensProvider: {
        resolveProvider: false,
      },
      codeActionProvider: true,
      executeCommandProvider: {
        commands: [],
      },
      textDocumentSync: TextDocumentSyncKind.Incremental,
    } as ServerCapabilities,
  };
});

connection.onInitialized(async () => {
  initializeConnection();
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(async (event) => {
      await Promise.all([
        ...event.removed.map((folder) =>
          workspace.removeProjectsInFolder(folder)
        ),
        ...event.added.map((folder) => workspace.addProjectsInFolder(folder)),
      ]);
    });
  }
});

const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

documents.onDidChangeContent(
  debounceHandler((params) => {
    const project = workspace.projectForFile(params.document.uri);
    if (!project) return;

    project.documentDidChange(params.document);
  })
);

connection.onDidChangeWatchedFiles((params) => {
  for (const { uri, type } of params.changes) {
    if (
      uri.endsWith("apollo.config.cjs") ||
      uri.endsWith("apollo.config.js") ||
      uri.endsWith(".env")
    ) {
      workspace.reloadProjectForConfig(uri);
    }

    // Don't respond to changes in files that are currently open,
    // because we'll get content change notifications instead
    if (type === FileChangeType.Changed) {
      continue;
    }

    const project = workspace.projectForFile(uri);
    if (!project) continue;

    switch (type) {
      case FileChangeType.Created:
        project.fileDidChange(uri);
        break;
      case FileChangeType.Deleted:
        project.fileWasDeleted(uri);
        break;
    }
  }
});

const languageProvider = new GraphQLLanguageProvider(workspace);

connection.onHover((params, token) =>
  languageProvider.provideHover(params.textDocument.uri, params.position, token)
);

connection.onDefinition((params, token) =>
  languageProvider.provideDefinition(
    params.textDocument.uri,
    params.position,
    token
  )
);

connection.onReferences((params, token) =>
  languageProvider.provideReferences(
    params.textDocument.uri,
    params.position,
    params.context,
    token
  )
);

connection.onDocumentSymbol((params, token) =>
  languageProvider.provideDocumentSymbol(params.textDocument.uri, token)
);

connection.onWorkspaceSymbol((params, token) =>
  languageProvider.provideWorkspaceSymbol(params.query, token)
);

connection.onCompletion(
  debounceHandler((params, token) =>
    languageProvider.provideCompletionItems(
      params.textDocument.uri,
      params.position,
      token
    )
  )
);

connection.onCodeLens(
  debounceHandler((params, token) =>
    languageProvider.provideCodeLenses(params.textDocument.uri, token)
  )
);

connection.onCodeAction(
  debounceHandler((params, token) =>
    languageProvider.provideCodeAction(
      params.textDocument.uri,
      params.range,
      token
    )
  )
);

connection.onNotification("apollographql/reloadService", () =>
  workspace.reloadService()
);

connection.onNotification(
  "apollographql/tagSelected",
  (selection: QuickPickItem) => workspace.updateSchemaTag(selection)
);

connection.onNotification("apollographql/getStats", async ({ uri }) => {
  const status = await languageProvider.provideStats(uri);
  connection.sendNotification("apollographql/statsLoaded", status);
});

// Listen on the connection
connection.listen();
