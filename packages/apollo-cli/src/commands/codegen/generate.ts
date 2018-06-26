import 'apollo-codegen-core/lib/polyfills';
import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as path from "path";

import { TargetType, default as generate } from '../../generate';

import { buildClientSchema } from "graphql";

import * as globby from "globby";
import * as fs from 'fs';
import { promisify } from 'util';

import { toPromise, execute } from "apollo-link";

import { engineLink, getIdFromKey } from "../../engine";
import { SCHEMA_QUERY } from "../../operations/schema";

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
      default: "schema.json",
    }),

    key: flags.string({
      description: "The API key for the Apollo Engine service",
    }),
    tag: flags.string({
      description: "The tag of the registered schema to get from Apollo Engine"
    }),
    engine: flags.string({
      description: "Reporting URL for a custom Apollo Engine deployment",
      hidden: true,
    }),

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
      description: "Path to write the generated code to",
      required: true
    }
  ]

  async run() {
    const { flags, args } = this.parse(Generate);

    if (!args.output) {
      this.error("The output path must be specified in the arguments");
      return;
    }

    let inferredTarget: TargetType;
    if (flags.target) {
      if (["swift", "typescript", "flow", "scala"].includes(flags.target)) {
        inferredTarget = flags.target as TargetType;
      } else {
        this.error(`Unsupported target: ${flags.target}`);
      }
    } else {
      switch(args.output.split('.').reverse()[0]) {
        case "swift":
          inferredTarget = "swift";
          break;

        case "ts" || "tsx":
          inferredTarget = "typescript";
          break;

        case "js":
          inferredTarget = "flow";
          break;

        case "scala":
          inferredTarget = "scala";
          break;

        default:
          this.error("Could not infer target from output file type, please use --target");
          return;
      }

      this.log(`\nInferred target for code generation: ${inferredTarget}\n`);
    }

    const apiKey = process.env.ENGINE_API_KEY || flags.key;
    const pullFromEngine = !!apiKey;

    const tasks = new Listr([
      {
        title: "Scanning for GraphQL queries",
        task: async ctx => {
          const paths = await globby(flags.queries ? [ flags.queries ] : []);
          ctx.queryPaths = paths;
        }
      },
      {
        title: pullFromEngine ? "Loading schema from Apollo Engine" : "Loading GraphQL schema",
        task: async ctx => {
          if (pullFromEngine) {
            const variables = {
              id: getIdFromKey(apiKey as string),
              tag: flags.tag || "current",
            }

            const engineSchema = await toPromise(
              execute(engineLink, {
                query: SCHEMA_QUERY,
                variables,
                context: {
                  headers: { ["x-api-key"]: apiKey },
                  ...(flags.engine && { uri: flags.engine }),
                },
              })
            );

            if (engineSchema.data && engineSchema.data.service.schema) {
              ctx.schema = buildClientSchema(
                engineSchema.data.service.schema
              );
            } else {
              this.error("Failed to get schema from Apollo Engine");
            }
          } else {
            const schemaFileContent = await promisify(fs.readFile)(path.resolve(flags.schema as string));
            const schemaData = JSON.parse(schemaFileContent as any as string);
            ctx.schema = buildClientSchema(
              (schemaData.data) ? schemaData.data : (
                schemaData.__schema ? schemaData : { __schema: schemaData }
              )
            )
          }
        }
      },
      {
        title: "Generating query files",
        task: async ctx => {
          generate(
            ctx.queryPaths,
            ctx.schema,
            args.output as string,
            flags.only ? path.resolve(flags.only) : "",
            inferredTarget,
            flags.tagName as string,
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
        },
      },
    ]);

    return tasks.run().then(async ({ }) => {
      this.exit(0);
    });
  }
}
