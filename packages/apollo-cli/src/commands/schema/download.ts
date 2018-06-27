import { Command, flags } from "@oclif/command";
import * as Listr from "listr";

import { fetchSchema } from "../../fetch-schema";

import * as fs from 'fs';
import { promisify } from 'util';

import { toPromise, execute } from "apollo-link";

import { engineLink, getIdFromKey } from "../../engine";
import { SCHEMA_QUERY } from "../../operations/schema";

import { engineFlags } from "../../engine-cli";

export default class SchemaDownload extends Command {
  static description = "Download the schema from your GraphQL endpoint.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help",
    }),
    header: flags.string({
      multiple: true,
      parse: header => {
        const [key, value] = header.split(":");
        return JSON.stringify({ [key.trim()]: value.trim() });
      },
      description:
        "Additional headers to send to server for introspectionQuery",
    }),
    endpoint: flags.string({
      description: "The URL of the server to fetch the schema from",
      default: "http://localhost:4000/graphql", // apollo-server 2.0 default address
    }),

    ...engineFlags
  };

  static args = [
    {
      name: "output",
      description: "Path to write the introspection result to",
      required: true,
      default: "schema.json"
    }
  ]

  async run() {
    const { flags, args } = this.parse(SchemaDownload);

    const header = Array.isArray(flags.header) ? flags.header : [flags.header];

    const apiKey = flags.key;
    const pullFromEngine = !!apiKey;

    const tasks = new Listr([
      {
        title: pullFromEngine ? "Loading schema from Apollo Engine" : "Fetching local schema",
        task: async ctx => {
          if (pullFromEngine) {
            const variables = {
              id: getIdFromKey(apiKey as string),
              tag: "current",
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
              ctx.schema = engineSchema.data.service.schema.__schema;
            } else {
              this.error("Failed to get schema from Apollo Engine");
            }
          } else {
            ctx.schema = await fetchSchema({
              endpoint: flags.endpoint,
              header: header.filter(x => Boolean(x)).map(x => JSON.parse(x)),
            })
          }
        },
      },
      {
        title: `Saving schema to ${args.output}`,
        task: async ctx => {
          await promisify(fs.writeFile)(args.output, JSON.stringify(ctx.schema));
        },
      },
    ]);

    return tasks.run();
  }
}
