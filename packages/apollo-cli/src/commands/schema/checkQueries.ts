import 'apollo-codegen-core/lib/polyfills';
import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as path from "path";

import { buildClientSchema, validate, findDeprecatedUsages, GraphQLError } from "graphql";

import * as globby from "globby";
import * as fs from 'fs';
import { promisify } from 'util';

import { loadQueryDocuments } from "apollo-codegen-core/lib/loading";

import { engineFlags } from "../../engine-cli";

import { loadSchemaStep } from "../../load-schema"

// TODO: name this check and rename check to diff?
export default class CheckQueries extends Command {
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

    tagName: flags.string({
      description: "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    }),
  };

  async run() {
    const { flags } = this.parse(CheckQueries);

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
        title: "Checking query compatibility with schema",
        task: async (ctx, task) => {
          const docs = loadQueryDocuments(ctx.queryPaths, flags.tagName);

          const errors: GraphQLError[] = [];
          const warnings: GraphQLError[] = []

          docs.forEach((doc, i) => {
            const validateResult = validate(ctx.schema, doc);
            const deprecationResult = findDeprecatedUsages(ctx.schema, doc);

            errors.push(...validateResult);
            warnings.push(...deprecationResult);

            task.title = `Checking query compatibility with schema (${i + 1}/${docs.length}, ${errors.length} errors, ${warnings.length} warnings)`;
            return validateResult.concat(deprecationResult);
          });

          if (errors.length > 0 || warnings.length > 0) {
            throw { errors, warnings };
          }
        },
      },
    ]);

    return tasks.run().catch(({ errors, warnings }) => {
      if (warnings.length > 0) {
        this.log();
        this.warn(warnings.join("\n"));
      }

      if (errors.length > 0) {
        this.log();
        this.error("\n" + errors.join("\n") + "\n");
        this.log();
        this.exit(1);
      }

      this.log();
    });
  }
}
