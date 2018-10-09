import { dirname } from "path";
import {
  createConnection,
  ProposedFeatures,
  TextDocuments,
  FileChangeType,
  NotificationType
} from "vscode-languageserver";
import Uri from "vscode-uri";
import { findAndLoadConfig } from "apollo/lib/config";
import { GraphQLWorkspace } from "./workspace";
import { GraphQLLanguageProvider } from "./languageProvider";

const connection = createConnection(ProposedFeatures.all);

let hasWorkspaceFolderCapability = false;

export class LoadingHandler {
  private latestLoadingToken = 0;
  async handle<T>(message: string, value: Promise<T>): Promise<T> {
    const token = this.latestLoadingToken;
    this.latestLoadingToken += 1;
    connection.sendNotification(
      new NotificationType<any, void>("apollographql/loading"),
      { message, token }
    );

    try {
      const ret = await value;
      connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      return ret;
    } catch (e) {
      connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      connection.window.showErrorMessage(`Error in "${message}": ${e}`);
      throw e;
    }
  }

  handleSync<T>(message: string, value: () => T): T {
    const token = this.latestLoadingToken;
    this.latestLoadingToken += 1;
    connection.sendNotification(
      new NotificationType<any, void>("apollographql/loading"),
      { message, token }
    );

    try {
      const ret = value();
      connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      return ret;
    } catch (e) {
      connection.sendNotification(
        new NotificationType<any, void>("apollographql/loadingComplete"),
        token
      );
      connection.window.showErrorMessage(`Error in "${message}": ${e}`);
      throw e;
    }
  }
}

const workspace = new GraphQLWorkspace(new LoadingHandler());

workspace.onDiagnostics(params => {
  connection.sendDiagnostics(params);
});

workspace.onDecorations(decs => {
  connection.sendNotification("apollographql/engineDecorations", decs);
});

const hasInitializedPromise = new Promise(resolve => {
  connection.onInitialized(async () => {
    resolve();

    if (hasWorkspaceFolderCapability) {
      connection.workspace.onDidChangeWorkspaceFolders(event => {
        event.removed.forEach(folder =>
          workspace.removeProjectsInFolder(folder)
        );
        event.added.forEach(folder => workspace.addProjectsInFolder(folder));
      });
    }
  });
});

connection.onInitialize(async params => {
  let capabilities = params.capabilities;
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && capabilities.workspace.workspaceFolders
  );

  const workspaceFolders = params.workspaceFolders;
  if (workspaceFolders) {
    hasInitializedPromise.then(() => {
      workspaceFolders.forEach(folder => workspace.addProjectsInFolder(folder));
    });
  }

  return {
    capabilities: {
      hoverProvider: true,
      definitionProvider: true,
      referencesProvider: true,
      completionProvider: {
        resolveProvider: false,
        triggerCharacters: ["..."]
      },
      codeLensProvider: {
        resolveProvider: false
      },
      textDocumentSync: documents.syncKind
    }
  };
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

    const filePath = Uri.parse(change.uri).fsPath;
    if (
      filePath.endsWith("apollo.config.js") ||
      filePath.endsWith("package.json")
    ) {
      const projectForConfig = Array.from(
        workspace.projectsByFolderUri.values()
      )
        .flatMap(arr => arr)
        .find(proj => {
          return proj.configFile === filePath;
        });

      if (projectForConfig) {
        const newConfig = findAndLoadConfig(
          dirname(projectForConfig.configFile),
          false,
          true
        );

        if (newConfig) {
          projectForConfig.updateConfig(newConfig);
        }
      }
    }

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

connection.onHover((params, token) => {
  return languageProvider.provideHover(
    params.textDocument.uri,
    params.position,
    token
  );
});

connection.onDefinition((params, token) => {
  return languageProvider.provideDefinition(
    params.textDocument.uri,
    params.position,
    token
  );
});

connection.onReferences((params, token) => {
  return languageProvider.provideReferences(
    params.textDocument.uri,
    params.position,
    params.context,
    token
  );
});

connection.onCompletion((params, token) => {
  return languageProvider.provideCompletionItems(
    params.textDocument.uri,
    params.position,
    token
  );
});

connection.onCodeLens((params, token) => {
  return languageProvider.provideCodeLenses(params.textDocument.uri, token);
});

connection.listen();
