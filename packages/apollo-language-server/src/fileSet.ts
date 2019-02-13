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
    excludes
  }: {
    rootURI: URI;
    includes: string[];
    excludes: string[];
  }) {
    invariant(rootURI, `Must provide "rootURI".`);
    invariant(includes, `Must provide "includes".`);
    invariant(excludes, `Must provide "excludes".`);

    this.rootURI = rootURI;
    this.includes = includes;
    this.excludes = excludes;
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
