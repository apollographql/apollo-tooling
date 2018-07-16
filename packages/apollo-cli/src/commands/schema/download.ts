import { Command, flags } from "@oclif/command";
import * as Listr from "listr";

import { fs } from "apollo-codegen-core/lib/localfs";
import { promisify } from "util";

import { engineFlags } from "../../engine-cli";

import { loadSchemaStep } from "../../load-schema";

import { fetchSchema } from "../../fetch-schema";

export default class SchemaDownload extends Command {
  static description = "Download the schema from your GraphQL endpoint.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help"
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
        "The URL of the server to fetch the schema from or path to ./your/local/schema.graphql",
      default: "http://localhost:4000/graphql" // apollo-server 2.0 default address
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

    const apiKey = flags.key;
    const pullFromEngine = !!apiKey && !flags.endpoint;

    const tasks: Listr = new Listr([
      loadSchemaStep(
        pullFromEngine,
        apiKey,
        "Fetching local schema",
        async ctx => {
          ctx.schema = await fetchSchema({
            url: flags.endpoint,
            headers: header.filter(x => Boolean(x)).map(x => JSON.parse(x))
          });
        }
      ),
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
