import {
  WorkspaceFolder,
  NotificationHandler,
  PublishDiagnosticsParams
} from "vscode-languageserver";
import Uri from "vscode-uri";
import { QuickPickItem } from "vscode";

import { GraphQLProject, DocumentUri } from "./project";
import { dirname } from "path";
import * as fg from "glob";
import { findAndLoadConfig } from "apollo/lib/config";
import { GraphQLDocument } from "./document";
import { Source, buildSchema } from "graphql";
import { LoadingHandler } from "./loadingHandler";

export class GraphQLWorkspace {
  private _onDiagnostics?: NotificationHandler<PublishDiagnosticsParams>;
  private _onDecorations?: (any: any) => void;
  private _onSchemaTags?: (tags: Map<string, string[]>) => void;
  public projectsByFolderUri: Map<string, GraphQLProject[]> = new Map();

  constructor(private loadingHandler: LoadingHandler) {}

  onDiagnostics(handler: NotificationHandler<PublishDiagnosticsParams>) {
    this._onDiagnostics = handler;
  }

  onDecorations(handler: (any: any) => void) {
    this._onDecorations = handler;
  }

  onSchemaTags(handler: (tags: Map<string, string[]>) => void): void {
    this._onSchemaTags = handler;
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
          this.loadingHandler.showError(
            `Failed to load apollo.config.js in folder ${configFolder}`
          );
          return [];
        }
      }
    );

    const projects = projectConfigs.map(projectConfig => {
      const project = new GraphQLProject(
        projectConfig,
        projectConfig.configFile,
        this.loadingHandler
      );

      project.onSchemaTags((tags: Map<string, string[]>) => {
        this._onSchemaTags && this._onSchemaTags(tags);
      });

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

  updateSchemaTag(selection: QuickPickItem) {
    this.projectsByFolderUri.forEach(projects => {
      projects.forEach(project => {
        const projectConsumesService = project.config.schemas!.default.engineKey!.includes(
          selection.detail!
        );
        if (projectConsumesService) {
          project.updateSchemaTag(selection.label);
        }
      });
    });
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
