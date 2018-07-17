import { Command, flags } from "@oclif/command";
import * as Listr from "listr";

import { fs } from "apollo-codegen-core/lib/localfs";
import { promisify } from "util";

import { engineFlags } from "../../engine-cli";

import { loadSchema } from "../../load-schema";

import {
  loadConfigFromFile,
  findAndLoadConfig
} from "../../config";
import { resolve } from 'path';

export default class SchemaDownload extends Command {
  static description = "Download the schema from your GraphQL endpoint.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help"
    }),
    config: flags.string({
      description: "Path to your Apollo config file"
    }),
    header: flags.string({
      multiple: true,
      parse: header => {
        const [key, value] = header.split(":");
        return JSON.stringify({ [key.trim()]: value.trim() });
      },
      description: "Additional headers to send to server for introspectionQuery"
    }),
    endpoint: flags.string({
      description:
        "The URL of the server to fetch the schema from or path to ./your/local/schema.graphql"
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
  ];

  async run() {
    const { flags, args } = this.parse(SchemaDownload);

    const header = Array.isArray(flags.header) ? flags.header : [flags.header];

    const tasks: Listr = new Listr([
      {
        title: "Loading Apollo config",
        task: async ctx => {
          if (flags.config) {
            ctx.config = loadConfigFromFile(flags.config) || {};
          } else {
            ctx.config = findAndLoadConfig(resolve(".")) || {};
          }

          ctx.config = {
            ...ctx.config,
            endpoint: {
              ...ctx.config.endpoint,
              ...(flags.endpoint && { url: flags.endpoint }),
              ...(header.length > 0 && { headers: (header
                .filter(x => !!x)
                .map(x => JSON.parse(x))
                .reduce((a, b) => Object.assign(a, b), {})) })
            },
            ...(flags.key && { engineKey: flags.key })
          };

          if (!ctx.config.endpoint.url) {
            ctx.config.endpoint.url = "http://localhost:4000/graphql";
          }
        }
      },
      {
        title: "Fetching current schema",
        task: async ctx => {
          ctx.schema = await loadSchema(ctx.config).catch(this.error);
        }
      },
      {
        title: `Saving schema to ${args.output}`,
        task: async ctx => {
          await promisify(fs.writeFile)(
            args.output,
            JSON.stringify(ctx.schema)
          );
        }
      }
    ]);

    return tasks.run();
  }
}
