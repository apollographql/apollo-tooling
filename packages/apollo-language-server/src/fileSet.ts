import { relative } from "path";
import minimatch = require("minimatch");
import * as glob from "glob";
import { invariant } from "@apollographql/apollo-tools";

export class FileSet {
  private rootPath: string;
  private includes: string[];
  private excludes: string[];

  constructor({
    rootPath,
    includes,
    excludes
  }: {
    rootPath: string;
    includes: string[];
    excludes: string[];
  }) {
    invariant(rootPath, `Must provide "rootPath".`);
    invariant(includes, `Must provide "includes".`);
    invariant(excludes, `Must provide "excludes".`);

    this.rootPath = rootPath;
    this.includes = includes;
    this.excludes = excludes;
  }

  includesFile(filePath: string): boolean {
    filePath = relative(this.rootPath, filePath);

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
