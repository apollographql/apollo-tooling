import { relative } from "path";
import minimatch = require("minimatch");
import * as glob from "glob";
import { invariant } from "@apollographql/apollo-tools";
import URI from "vscode-uri";

export class FileSet {
  private rootURI: URI;
  private includes: string[];
  private excludes: string[];

  constructor({
    rootURI,
    includes,
    excludes,
    configURI
  }: {
    rootURI: URI;
    includes: string[];
    excludes: string[];
    configURI?: URI;
  }) {
    invariant(rootURI, `Must provide "rootURI".`);
    invariant(includes, `Must provide "includes".`);
    invariant(excludes, `Must provide "excludes".`);

    this.rootURI = rootURI;
    this.includes = includes;
    this.excludes = excludes;

    /**
     * This function is used in the Array.filter function below it to remove any .env files and config files.
     * If there are 0 files remaining after removing those files, we should warn the user that their config
     * may be wrong. We shouldn't throw an error here, since they could just be initially setting up a project
     * and there's no way to know for sure that there _should_ be files.
     */
    const filterConfigAndEnvFiles = (path: string) =>
      !(
        path.includes("apollo.config") ||
        path.includes(".env") ||
        (configURI && path === configURI.fsPath)
      );
    if (this.allFiles().filter(filterConfigAndEnvFiles).length === 0) {
      console.warn(
        "⚠️  It looks like there are 0 files associated with this Apollo Project. " +
          "This may be because you don't have any files yet, or your includes/excludes " +
          "fields are configured incorrectly, and Apollo can't find your files. " +
          "For help configuring Apollo projects, see this guide: https://bit.ly/2ByILPj"
      );
    }
  }

  includesFile(filePath: string): boolean {
    filePath = relative(this.rootURI.fsPath, filePath);

    return (
      this.includes.some(include => minimatch(filePath, include)) &&
      !this.excludes.some(exclude => minimatch(filePath, exclude))
    );
  }

  allFiles(): string[] {
    return this.includes
      .flatMap(include =>
        glob.sync(include, { cwd: this.rootURI.fsPath, absolute: true })
      )
      .filter(
        filePath =>
          !this.excludes.some(exclude =>
            minimatch(relative(this.rootURI.fsPath, filePath), exclude)
          )
      );
  }
}
