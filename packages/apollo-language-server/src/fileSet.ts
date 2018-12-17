import { relative, dirname } from "path";
import minimatch = require("minimatch");
import * as glob from "glob";
import { invariant } from "@apollographql/apollo-tools";
import URI from "vscode-uri";

export class FileSet {
  private configPath?: string;
  private rootPath: string;
  private includes: string[];
  private excludes: string[];

  constructor({
    configPath,
    rootPath,
    includes,
    excludes
  }: {
    configPath?: string;
    rootPath: string;
    includes: string[];
    excludes: string[];
  }) {
    invariant(rootPath, `Must provide "rootPath".`);
    invariant(includes, `Must provide "includes".`);
    invariant(excludes, `Must provide "excludes".`);

    this.configPath = configPath;
    this.rootPath = rootPath;
    this.includes = includes;
    this.excludes = excludes;
  }

  includesFile(filePath: string, configDir?: URI): boolean {
    // if we're given a path to the config file, we should match the
    // "includes" glob relative to that dir. This allows us to run this command
    // from a "root" dir above the root of the project, like when at the root of a monorepo
    filePath = relative(configDir ? configDir.path : this.rootPath, filePath);
    return (
      this.includes.some(include => minimatch(filePath, include)) &&
      !this.excludes.some(exclude => minimatch(filePath, exclude))
    );
  }

  allFiles(): string[] {
    return this.includes
      .flatMap(include =>
        glob.sync(include, { cwd: this.rootPath, absolute: true })
      )
      .filter(
        filePath =>
          !this.excludes.some(exclude =>
            minimatch(relative(this.rootPath, filePath), exclude)
          )
      );
  }
}
