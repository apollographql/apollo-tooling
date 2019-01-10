import "apollo-env";
// FIXME: The global fetch dependency comes from `apollo-link-http` and should be removed there.
import "apollo-env/lib/fetch/global";
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  FileChangeType,
  ServerCapabilities
} from "vscode-languageserver";
import { QuickPickItem } from "vscode";
import { GraphQLWorkspace } from "./workspace";
import { GraphQLLanguageProvider } from "./languageProvider";
import { LanguageServerLoadingHandler } from "./loadingHandler";

const connection = createConnection(ProposedFeatures.all);

let hasWorkspaceFolderCapability = false;

const workspace = new GraphQLWorkspace(
  new LanguageServerLoadingHandler(connection),
  {
    clientIdentity: {
      name: process.env["APOLLO_CLIENT_NAME"],
      version: process.env["APOLLO_CLIENT_VERSION"],
      referenceID: process.env["APOLLO_CLIENT_REFERENCE_ID"]
    }
  }
);

workspace.onDiagnostics(params => {
  connection.sendDiagnostics(params);
});

workspace.onDecorations(params => {
  connection.sendNotification("apollographql/engineDecorations", params);
});

workspace.onSchemaTags(params => {
  connection.sendNotification(
    "apollographql/tagsLoaded",
    JSON.stringify(params)
  );
});

connection.onInitialize(async params => {
  let capabilities = params.capabilities;
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && capabilities.workspace.workspaceFolders
  );

  const workspaceFolders = params.workspaceFolders;
  if (workspaceFolders) {
    // We wait until all projects are added, because after `initialize` returns we can get additional requests
    // like `textDocument/codeLens`, and that way these can await `GraphQLProject#whenReady` to make sure
    // we provide them eventually.
    await Promise.all(
      workspaceFolders.map(folder => workspace.addProjectsInFolder(folder))
    );
  }

  return {
    capabilities: {
      hoverProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ["..."]
      },
      definitionProvider: true,
      referencesProvider: true,
      documentSymbolProvider: true,
      workspaceSymbolProvider: true,
      codeLensProvider: {
        resolveProvider: false
      },
      executeCommandProvider: {
        commands: []
      },
      textDocumentSync: documents.syncKind
    } as ServerCapabilities
  };
});

connection.onInitialized(async () => {
  if (hasWorkspaceFolderCapability) {
    connection.workspace.onDidChangeWorkspaceFolders(async event => {
      await Promise.all([
        ...event.removed.map(folder =>
          workspace.removeProjectsInFolder(folder)
        ),
        ...event.added.map(folder => workspace.addProjectsInFolder(folder))
      ]);
    });
  }
});

const documents: TextDocuments = new TextDocuments();

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

documents.onDidChangeContent(params => {
  const project = workspace.projectForFile(params.document.uri);
  if (!project) return;

  project.documentDidChange(params.document);
});

connection.onDidChangeWatchedFiles(params => {
  for (const change of params.changes) {
    const uri = change.uri;

    // FIXME: Re-enable updating projects when config files change.

    // const filePath = Uri.parse(change.uri).fsPath;
    // if (
    //   filePath.endsWith("apollo.config.js") ||
    //   filePath.endsWith("package.json")
    // ) {
    //   const projectForConfig = Array.from(
    //     workspace.projectsByFolderUri.values()
    //   )
    //     .flatMap(arr => arr)
    //     .find(proj => {
    //       return proj.configFile === filePath;
    //     });

    //   if (projectForConfig) {
    //     const newConfig = findAndLoadConfig(
    //       dirname(projectForConfig.configFile),
    //       false,
    //       true
    //     );

    //     if (newConfig) {
    //       projectForConfig.updateConfig(newConfig);
    //     }
    //   }
    // }

    // Don't respond to changes in files that are currently open,
    // because we'll get content change notifications instead

    if (change.type === FileChangeType.Changed) {
      continue;
    }

    const project = workspace.projectForFile(uri);
    if (!project) continue;

    switch (change.type) {
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

connection.onCompletion((params, token) =>
  languageProvider.provideCompletionItems(
    params.textDocument.uri,
    params.position,
    token
  )
);

connection.onCodeLens((params, token) =>
  languageProvider.provideCodeLenses(params.textDocument.uri, token)
);

connection.onNotification("apollographql/reloadService", () =>
  workspace.reloadService()
);

connection.onNotification(
  "apollographql/tagSelected",
  (selection: QuickPickItem) => workspace.updateSchemaTag(selection)
);

// Listen on the connection
connection.listen();
