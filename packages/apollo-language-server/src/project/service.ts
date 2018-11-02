import { GraphQLProject } from "./base";
import { LoadingHandler } from "../loadingHandler";
import { FileSet } from "../fileSet";
import { ServiceConfigFormat, getServiceName } from "../config";

export const isServiceProject = (
  project: GraphQLProject
): project is GraphQLServiceProject => project.__type === "service";

export class GraphQLServiceProject extends GraphQLProject {
  public config: ServiceConfigFormat;
  constructor(
    config: ServiceConfigFormat,
    loadingHandler: LoadingHandler,
    rootPath: string
  ) {
    const fileSet = new FileSet({
      rootPath,
      includes: config.service.includes,
      excludes: config.service.excludes
    });

    super(fileSet, loadingHandler);
    this.__type = "service";
    this.config = config;
  }

  get displayName() {
    return getServiceName(this.config);
  }

  validate() {}
}
