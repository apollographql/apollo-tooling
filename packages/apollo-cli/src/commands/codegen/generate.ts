import 'apollo-codegen-core/lib/polyfills';
import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as path from "path";

import { TargetType, default as generate } from '../../generate';

import { buildClientSchema } from "graphql";

import * as globby from "globby";
import * as fs from 'fs';
import { promisify } from 'util';

import { loadSchemaStep } from "../../load-schema";

import { engineFlags } from "../../engine-cli";

export default class Generate extends Command {
  static description = "Generate static types for GraphQL queries.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help",
    }),
    queries: flags.string({
      description: "Path to your GraphQL queries, can include search tokens like **",
      default: "**/*.graphql",
    }),
    schema: flags.string({
      description: "Path to your GraphQL schema introspection result",
    }),

    ...engineFlags,

    target: flags.string({
      description: "Type of code generator to use (swift | typescript | flow | scala), inferred from output"
    }),
    namespace: flags.string({
      description: "The namespace to emit generated code into."
    }),
    passthroughCustomScalars: flags.boolean({
      description: "Use your own types for custom scalars"
    }),
    customScalarsPrefix: flags.string({
      description: "Include a prefix when using provided types for custom scalars"
    }),
    addTypename: flags.boolean({
      description: "Automatically add __typename to your queries"
    }),
    operationIdsPath: flags.string({
      description: "Path to an operation id JSON map file. If specified, also stores the operation ids (hashes) as properties on operation types [currently Swift-only]"
    }),
    mergeInFieldsFromFragmentSpreads: flags.boolean({
      description: "Merge fragment fields onto its enclosing type"
    }),
    useFlowExactObjects: flags.boolean({
      description: "Use Flow read only types for generated types [flow only]"
    }),
    useFlowReadOnlyTypes: flags.boolean({
      description: "Use Flow read only types for generated types [flow only]"
    }),
    only: flags.string({
      description: "Parse all input files, but only output generated code for the specified file [Swift only]"
    }),
    tagName: flags.string({
      description: "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    }),
  };

  static args = [
    {
      name: "output",
      description: "Path to write the generated code to. Can be a directory to generate split files (TypeScript/Flow only). Leave empty to generate types next to sources (TypeScript/Flow only)",
    }
  ]

  async run() {
    const { flags, args } = this.parse(Generate);

    let inferredTarget: TargetType = "" as TargetType;
    if (flags.target) {
      if (["swift", "typescript", "flow", "scala"].includes(flags.target)) {
        inferredTarget = flags.target as TargetType;
      } else {
        this.error(`Unsupported target: ${flags.target}`);
      }
    } else if (args.output) {
      switch(args.output.split('.').reverse()[0]) {
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
          this.error("Could not infer target from output file type, please use --target");
          return;
      }
    }

    if (!args.output && inferredTarget != "typescript" && inferredTarget != "flow") {
      this.error("The output path must be specified in the arguments for Swift and Scala");
      return;
    }

    const apiKey = flags.key;
    const pullFromEngine = !!apiKey && !flags.schema;

    const tasks: Listr = new Listr([
      {
        title: "Scanning for GraphQL queries",
        task: async (ctx, task) => {
          const paths = await globby(flags.queries ? [ flags.queries ] : []);
          task.title = `Scanning for GraphQL queries (${paths.length} found)`;
          ctx.queryPaths = paths;
        }
      },
      loadSchemaStep(this, pullFromEngine, apiKey, flags.engine, "Loading GraphQL schema", async (ctx) => {
        const schemaFileContent = await promisify(fs.readFile)(path.resolve(flags.schema as string));
        const schemaData = JSON.parse(schemaFileContent as any as string);
        ctx.schema = (schemaData.data) ? schemaData.data.__schema : (
          schemaData.__schema ? schemaData.__schema : schemaData
        );
      }),
      {
        title: "Parsing GraphQL schema",
        task: async (ctx) => {
          ctx.schema = buildClientSchema(
            { __schema: ctx.schema }
          );
        }
      },
      {
        title: "Generating query files",
        task: async (ctx, task) => {
          task.title = `Generating query files with '${inferredTarget}' target`;
          const writtenFiles = generate(
            ctx.queryPaths,
            ctx.schema,
            args.output || path.resolve("."),
            flags.only ? path.resolve(flags.only) : "",
            inferredTarget,
            flags.tagName as string,
            !args.output,
            {
              passthroughCustomScalars: flags.passthroughCustomScalars || flags.customScalarsPrefix,
              customScalarsPrefix: flags.customScalarsPrefix || "",
              addTypename: flags.addTypename,
              namespace: flags.namespace,
              operationIdsPath: flags.operationIdsPath,
              generateOperationIds: !!flags.operationIdsPath,
              mergeInFieldsFromFragmentSpreads: flags.mergeInFieldsFromFragmentSpreads,
              useFlowExactObjects: flags.useFlowExactObjects,
              useFlowReadOnlyTypes: flags.useFlowReadOnlyTypes
            }
          )

          task.title = `Generating query files with '${inferredTarget}' target - wrote ${writtenFiles} files`;
        },
      },
    ]);

    return tasks.run();
  }
}
