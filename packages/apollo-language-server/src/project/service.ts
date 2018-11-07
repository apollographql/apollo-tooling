import { GraphQLProject, DocumentUri } from "./base";
import { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import { ServiceConfig } from "../config";
import { ClientIdentity } from "../engine";
import Uri from "vscode-uri";

export function isServiceProject(
  project: GraphQLProject
): project is GraphQLServiceProject {
  return project instanceof GraphQLServiceProject;
}

export interface GraphQLServiceProjectConfig {
  clientIdentity?: ClientIdentity;
  config: ServiceConfig;
  rootURI: DocumentUri;
  loadingHandler: LoadingHandler;
}
export class GraphQLServiceProject extends GraphQLProject {
  constructor({
    clientIdentity,
    config,
    rootURI,
    loadingHandler
  }: GraphQLServiceProjectConfig) {
    const fileSet = new FileSet({
      rootPath: Uri.parse(rootURI).fsPath,
      includes: config.service.includes,
      excludes: config.service.excludes
    });

    super({ config, fileSet, loadingHandler, clientIdentity });
    this.config = config;
  }

  get displayName() {
    return this.config.name || "Unnamed Project";
  }

  initialize() {
    return [];
  }

  validate() {}
}
