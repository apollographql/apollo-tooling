import {
  WorkspaceFolder,
  NotificationHandler,
  PublishDiagnosticsParams
} from "vscode-languageserver";
import Uri from "vscode-uri";

import { GraphQLProject, DocumentUri } from "./project";
import { dirname } from "path";
import * as fg from "glob";
import { findAndLoadConfig } from "apollo/lib/config";
import { GraphQLDocument } from "./document";
import { Source, buildSchema } from "graphql";

export class GraphQLWorkspace {
  private _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;
  private _onDecorations?: (any: any) => void;
  public projectsByFolderUri: Map<string, GraphQLProject[]> = new Map();

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
  }

  onDecorations(handler: (any: any) => void) {
    this._onDecorations = handler;
  }

  addProjectsInFolder(folder: WorkspaceFolder) {
    const apolloConfigFiles: string[] = fg.sync("**/apollo.config.js", {
      cwd: Uri.parse(folder.uri).fsPath,
      absolute: true,
      ignore: "**/node_modules/**"
    });

    apolloConfigFiles.push(
      ...fg.sync("**/package.json", {
        cwd: Uri.parse(folder.uri).fsPath,
        absolute: true,
        ignore: "**/node_modules/**"
      })
    );

    const apolloConfigFolders = new Set<string>(
      apolloConfigFiles.map(f => dirname(f))
    );

    const projectConfigs = Array.from(apolloConfigFolders).flatMap(
      configFolder => {
        try {
          return [findAndLoadConfig(configFolder, false, true)];
        } catch (e) {
          console.error(e);
          return [];
        }
      }
    );

    const projects = projectConfigs.map(projectConfig => {
      const project = new GraphQLProject(
        projectConfig,
        projectConfig.configFile
      );

      project.onDiagnostics(params => {
        this._onDiagnostics && this._onDiagnostics(params);
      });

      project.onDecorations(params => {
        this._onDecorations && this._onDecorations(params);
      });

      return project;
    });

    this.projectsByFolderUri.set(folder.uri, projects);
  }

  removeProjectsInFolder(folder: WorkspaceFolder) {
    const projects = this.projectsByFolderUri.get(folder.uri);
    if (projects) {
      projects.forEach(project => project.clearAllDiagnostics());
      this.projectsByFolderUri.delete(folder.uri);
    }
  }

  projectForFile(uri: DocumentUri): GraphQLProject | undefined {
    if (uri.startsWith("graphql-schema")) {
      return ({
        documentAt(uri: string, _: any) {
          return {
            doc: new GraphQLDocument(new Source(Uri.parse(uri).query, uri)),
            set: {
              schema: buildSchema(new Source(Uri.parse(uri).query, uri))
            }
          };
        },
        documentDidChange() {},
        documentsAt() {}
      } as any) as GraphQLProject;
    }

    for (const projects of this.projectsByFolderUri.values()) {
      const project = projects.find(project => project.includesFile(uri));
      if (project) {
        return project;
      }
    }
    return undefined;
  }
}
