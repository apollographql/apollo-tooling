import { relative, dirname } from "path";
import minimatch = require("minimatch");
import * as glob from "glob";
import { invariant } from "@apollographql/apollo-tools";
import URI from "vscode-uri";

export class FileSet {
  private configDirURI?: URI;
  private rootURI: URI;
  private includes: string[];
  private excludes: string[];

  constructor({
    configURI,
    rootURI,
    includes,
    excludes
  }: {
    configURI?: URI;
    rootURI: URI;
    includes: string[];
    excludes: string[];
  }) {
    invariant(rootURI, `Must provide "rootURI".`);
    invariant(includes, `Must provide "includes".`);
    invariant(excludes, `Must provide "excludes".`);

    // the URI of the folder _containing_ the apollo.config.js
    this.configDirURI =
      configURI && configURI.fsPath.includes(".js")
        ? URI.parse(dirname(configURI.fsPath))
        : configURI;
    this.rootURI = rootURI;
    this.includes = includes;
    this.excludes = excludes;
  }

  includesFile(filePath: string, configDirURI?: URI): boolean {
    // if we're given a path to the config file, we should match the
    // "includes" glob relative to that dir. This allows us to run this command
    // from a "root" dir above the root of the project, like when at the root of a monorepo
    filePath = relative(
      configDirURI ? configDirURI.path : this.rootURI.fsPath,
      filePath
    );
    return (
      this.includes.some(include => minimatch(filePath, include)) &&
      !this.excludes.some(exclude => minimatch(filePath, exclude))
    );
  }

  allFiles(): string[] {
    return this.includes
      .flatMap(include =>
        glob.sync(include, {
          cwd: this.configDirURI
            ? this.configDirURI.fsPath
            : this.rootURI.fsPath,
          absolute: true
        })
      )
      .filter(
        filePath =>
          !this.excludes.some(exclude =>
            minimatch(
              relative(
                this.configDirURI
                  ? this.configDirURI.fsPath
                  : this.rootURI.fsPath,
                filePath
              ),
              exclude
            )
          )
      );
  }
}
