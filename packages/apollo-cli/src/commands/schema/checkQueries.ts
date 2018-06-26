import 'apollo-codegen-core/lib/polyfills';
import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as path from "path";

import { TargetType, default as generate } from '../../generate';

import { buildClientSchema, validate, findDeprecatedUsages, GraphQLError } from "graphql";

import * as globby from "globby";
import * as fs from 'fs';
import { promisify } from 'util';

import { toPromise, execute } from "apollo-link";

import { engineLink, getIdFromKey } from "../../engine";
import { SCHEMA_QUERY } from "../../operations/schema";

import { loadQueryDocuments } from "apollo-codegen-core/lib/loading";

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

    tagName: flags.string({
      description: "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    }),
  };

  async run() {
    const { flags } = this.parse(CheckQueries);

    const apiKey = process.env.ENGINE_API_KEY || flags.key;
    const pullFromEngine = !!apiKey;

    const tasks = new Listr([
      {
        title: "Scanning for GraphQL queries",
        task: async (ctx, task) => {
          const paths = await globby(flags.queries ? [ flags.queries ] : []);
          task.title = `Scanning for GraphQL queries (${paths.length} found)`;
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
        this.warn(warnings.join("\n"));
      }

      if (errors.length > 0) {
        this.error(errors.join("\n"));
        this.exit(1);
      }
    });
  }
}
