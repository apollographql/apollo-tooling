import { Command, flags } from "@oclif/command";
import * as Listr from "listr";

import { fs } from "apollo-codegen-core/lib/localfs";
import { promisify } from "util";

import { engineFlags } from "../../engine-cli";

import { loadSchema } from "../../load-schema";

import { loadConfigStep } from "../../load-config";

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
    skipSSLValidation: flags.boolean({
      char: "k",
      description: "Allow connections to a SSL site without certs"
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

    const tasks: Listr = new Listr([
      loadConfigStep(flags, false),
      {
        title: "Fetching current schema",
        task: async ctx => {
          if (Object.values(ctx.config.schemas).length > 1) {
            this.error("More than one schema found.");
          }

          if (Object.values(ctx.config.schemas).length == 0) {
            this.error("No schemas found.");
          }

          ctx.schema = await loadSchema(
            Object.values(ctx.config.schemas)[0],
            ctx.config
          );
        }
      },
      {
        title: `Saving schema to ${args.output}`,
        task: async ctx => {
          await promisify(fs.writeFile)(
            args.output,
            JSON.stringify({ __schema: ctx.schema }, null, 2)
          );
        }
      }
    ]);

    return tasks.run();
  }
}
