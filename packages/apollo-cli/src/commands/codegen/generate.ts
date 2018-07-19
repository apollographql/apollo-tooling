import "apollo-codegen-core/lib/polyfills";
import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as path from "path";

import { TargetType, default as generate } from "../../generate";

import { engineFlags } from "../../engine-cli";

import { Gaze } from "gaze";

import { resolveDocumentSets, ResolvedDocumentSet } from "../../config";
import { loadConfigStep } from "../../load-config";

const waitForKey = async () => {
  console.log("Press any key to stop.");
  process.stdin.setRawMode!(true);
  return new Promise(resolve =>
    process.stdin.once("data", () => {
      (process.stdin as any).unref();
      process.stdin.setRawMode!(false);
      resolve();
    })
  );
};

export default class Generate extends Command {
  static description =
    "Generate static types for GraphQL queries. Can use the published schema in Apollo Engine or a downloaded schema.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help"
    }),
    config: flags.string({
      description: "Path to your Apollo config file"
    }),
    queries: flags.string({
      description:
        "Path to your GraphQL queries, can include search tokens like **",
      default: "**/*.graphql"
    }),
    schema: flags.string({
      description: "Path to your GraphQL schema (.graphql, .json, .js, .ts)"
    }),
    clientSchema: flags.string({
      description:
        "Path to your client-side GraphQL schema file for `apollo-link-state` (.graphql, .json, .js, .ts)"
    }),

    ...engineFlags,

    target: flags.string({
      description:
        "Type of code generator to use (swift | typescript | flow | scala), inferred from output"
    }),
    namespace: flags.string({
      description: "The namespace to emit generated code into."
    }),
    passthroughCustomScalars: flags.boolean({
      description: "Use your own types for custom scalars"
    }),
    customScalarsPrefix: flags.string({
      description:
        "Include a prefix when using provided types for custom scalars"
    }),
    addTypename: flags.boolean({
      description: "Automatically add __typename to your queries"
    }),
    operationIdsPath: flags.string({
      description:
        "Path to an operation id JSON map file. If specified, also stores the operation ids (hashes) as properties on operation types [currently Swift-only]"
    }),
    mergeInFieldsFromFragmentSpreads: flags.boolean({
      description: "Merge fragment fields onto its enclosing type"
    }),
    useFlowExactObjects: flags.boolean({
      description: "Use Flow exact objects for generated types [flow only]"
    }),
    useFlowReadOnlyTypes: flags.boolean({
      description: "Use Flow read only types for generated types [flow only]"
    }),
    only: flags.string({
      description:
        "Parse all input files, but only output generated code for the specified file [Swift only]"
    }),
    tagName: flags.string({
      description:
        "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    }),
    outputFlat: flags.boolean({
      description:
        'By default, TypeScript/Flow will put each generated file in a directory next to its source file using the value of the "output" as the directory name. Set "outputFlat" to put all generated files in the directory relative to the current working directory defined by "output".'
    }),
    watch: flags.boolean({
      description: "Watch the query files to auto-generate on changes."
    })
  };

  static args = [
    {
      name: "output",
      description: `Directory to which generated files will be written.
- For TypeScript/Flow generators, this specifies a directory relative to each source file by default.
- For TypeScript/Flow generators with the "outputFlat" flag is set, and for the Swift generator, this specifies a file or directory (absolute or relative to the current working directory) to which:
  - a file will be written for each query (if "output" is a directory)
  - all generated types will be written
- For all other types, this defines a file (absolute or relative to the current working directory) to which all generated types are written.`
    }
  ];

  async run() {
    const { flags, args } = this.parse(Generate);

    let inferredTarget: TargetType = "" as TargetType;
    if (flags.target) {
      if (
        [
          "json",
          "swift",
          "typescript",
          "flow",
          "scala",
          "typescript-legacy",
          "flow-legacy"
        ].includes(flags.target)
      ) {
        inferredTarget = flags.target as TargetType;
      } else {
        this.error(`Unsupported target: ${flags.target}`);
      }
    } else if (args.output) {
      switch (args.output.split(".").reverse()[0]) {
        case "json":
          inferredTarget = "json";
          break;

        case "swift":
          inferredTarget = "swift";
          break;

        case "ts" || "tsx":
          inferredTarget = "typescript";
          break;

        case "js" || "jsx":
          inferredTarget = "flow";
          break;

        case "scala":
          inferredTarget = "scala";
          break;

        default:
          this.error(
            "Could not infer target from output file type, please use --target"
          );
          return;
      }
    }

    if (
      !args.output &&
      inferredTarget != "typescript" &&
      inferredTarget != "flow"
    ) {
      this.error(
        "The output path must be specified in the arguments for Swift and Scala"
      );
      return;
    }

    if (
      !flags.outputFlat &&
      (inferredTarget === "typescript" || inferredTarget === "flow") &&
      (args.output &&
        (path.isAbsolute(args.output) ||
          args.output.split(path.sep).length > 1))
    ) {
      this.error(
        'For TypeScript and Flow generators, "output" must be empty or a single directory name, unless the "outputFlat" flag is set.'
      );
      return;
    }

    const tasks: Listr = new Listr([
      loadConfigStep(flags),
      {
        title: "Resolving GraphQL document sets and dependencies",
        task: async (ctx, task) => {
          ctx.documentSets = await resolveDocumentSets(ctx.config, true);
          task.title = `Scanning for GraphQL queries (${
            ctx.documentSets.length
          } found)`; // this is a bogus wrong value

          // const excludedPaths = [
          //   flags.clientSchema ? path.resolve(flags.clientSchema) : undefined,
          //   ctx.config.schema ? path.resolve(ctx.config.schema) : undefined
          // ];

          // TODO: move filtering somewhere else
          // ctx.queryPaths = paths.filter(
          //   p => !excludedPaths.some(v => v == path.resolve(p))
          // ).map(p => path.relative(ctx.config.projectFolder, p));
        }
      },
      // {
      //   title: "Fetching current schema",
      //   task: async ctx => {
      //     ctx.schema = await loadSchema(ctx.config).catch(this.error);
      //   }
      // },
      // {
      //   title: "Parsing GraphQL schema",
      //   task: async (ctx, task) => {
      //     if (ctx.schema) {
      //       ctx.schema = buildClientSchema({ __schema: ctx.schema });
      //     } else {
      //       task.skip("No server-side schema provided");
      //     }
      //   }
      // },
      // {
      //   title: "Loading client-side GraphQL schema",
      //   task: async (ctx, task) => {
      //     if (!flags.clientSchema) {
      //       task.skip("Path to client schema not provided");
      //     } else {
      //       const foundDocuments = loadQueryDocuments([
      //         path.resolve(flags.clientSchema)
      //       ]);
      //       if (foundDocuments.length == 0) {
      //         this.error("Found no query documents, aborting");
      //       }

      //       if (foundDocuments.length > 1) {
      //         this.warn(
      //           "Found more than one query document, using the first one"
      //         );
      //       }

      //       const ast = foundDocuments[0];
            // visit(ast, {
            //   enter(node) {
            //     if (node.kind == "FieldDefinition") {
            //       (node as any).__client = true;
            //     }
            //   }
            // });

      //       if (ctx.schema) {
      //         ctx.schema = extendSchema(ctx.schema, ast);
      //       } else {
      //         ctx.schema = buildASTSchema(ast);
      //       }
      //     }
      //   }
      // },
      {
        title: "Generating query files",
        task: async (ctx, task) => {
          task.title = `Generating query files with '${inferredTarget}' target`;
          if (ctx.documentSets.length == 0) {
            // error
          } else if (ctx.documentSets.length == 1) {
            const set = ctx.documentSets[0] as ResolvedDocumentSet;
            const writtenFiles = generate(
              set.documentPaths.map(p =>
                path.relative(ctx.config.projectFolder, p)
              ),
              set.schema!,
              typeof args.output === "string" ? args.output : "__generated__",
              flags.only,
              inferredTarget,
              flags.tagName as string,
              !flags.outputFlat,
              {
                passthroughCustomScalars:
                  flags.passthroughCustomScalars || !!flags.customScalarsPrefix,
                customScalarsPrefix: flags.customScalarsPrefix || "",
                addTypename: flags.addTypename,
                namespace: flags.namespace,
                operationIdsPath: flags.operationIdsPath,
                generateOperationIds: !!flags.operationIdsPath,
                mergeInFieldsFromFragmentSpreads:
                  flags.mergeInFieldsFromFragmentSpreads,
                useFlowExactObjects: flags.useFlowExactObjects,
                useFlowReadOnlyTypes: flags.useFlowReadOnlyTypes
              }
            );

            task.title = `Generating query files with '${inferredTarget}' target - wrote ${writtenFiles} files`;
          } else {
            // TODO
          }
        }
      }
    ]);

    if (flags.watch) {
      await tasks.run().catch(() => {});
      const watcher = new Gaze(flags.queries!);
      watcher.on("all", () => {
        console.log("\nChange detected, generating types...");
        tasks.run().catch(() => {});
      });
      await waitForKey();
      watcher.close();
      return;
    } else {
      return tasks.run();
    }
  }
}
