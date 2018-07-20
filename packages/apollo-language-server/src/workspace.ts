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
    const apolloConfigFiles: string[] = fg.sync("apollo.config.js", {
      root: Uri.parse(folder.uri).fsPath,
      absolute: true
    });

    apolloConfigFiles.push(
      ...fg.sync("package.json", {
        root: Uri.parse(folder.uri).fsPath,
        absolute: true
      })
    );

    const projectConfigs = apolloConfigFiles.flatMap(configFile => {
      const loadedConfig = findAndLoadConfig(dirname(configFile), false, true);

      if (loadedConfig) {
        return [
          {
            config: loadedConfig,
            configFile
          }
        ];
      } else {
        return [];
      }
    });

    const projects = projectConfigs.map(projectConfig => {
      const project = new GraphQLProject(
        projectConfig.config,
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
    for (const projects of this.projectsByFolderUri.values()) {
      const project = projects.find(project => project.includesFile(uri));
      if (project) {
        return project;
      }
    }
    return undefined;
  }
}
