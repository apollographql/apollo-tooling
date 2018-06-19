import { Command, flags } from "@oclif/command";
import cli from "cli-ux";
import { table, styledJSON } from "heroku-cli-util";
import * as Listr from "listr";
import { toPromise, execute } from "apollo-link";
import * as util from "util";

import { UPLOAD_SCHEMA } from "../../operations/uploadSchema";
import { getIdFromKey, engineLink } from "../../engine";
import { fetchSchema } from "../../fetch-schema";
import { gitInfo } from "../../git";

export default class SchemaPublish extends Command {
  static description = "Publish a schema to Apollo Engine";

  static flags = {
    help: flags.help({ char: "h" }),

    apiKey: flags.string({
      description: "The API key for the Apollo Engine service",
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
      char: "e",
      description: "The URL of the server to fetch the schema from",
      default: "http://localhost:4000/graphql", // apollo-server 2.0 default address
    }),
    json: flags.boolean({
      description: "output successful publish result as JSON",
    }),
    engine: flags.string({
      description: "Reporting URL for a custom Engine deployment",
      hidden: true,
    }),
  };

  async run() {
    const { flags } = this.parse(SchemaPublish);
    // hardcoded to current until service / schema / tag is settled
    const tag = "current";

    const service = process.env.ENGINE_API_KEY || flags.apiKey;
    if (!service) {
      this.error(
        "No service was specified. Set an Apollo Engine API key using the `--apiKey` flag or the `ENGINE_API_KEY` environment variable."
      );
      return;
    }

    const header = Array.isArray(flags.header) ? flags.header : [flags.header];
    const tasks = new Listr([
      {
        title: "Fetching current schema",
        task: async ctx => {
          ctx.schema = await fetchSchema({
            endpoint: flags.endpoint,
            header: header.filter(x => !!x).map(x => JSON.parse(x)),
          }).catch(this.error);
        },
      },
      {
        title: `Publishing ${getIdFromKey(service)} to Apollo Engine`,
        task: async ctx => {
          const gitContext = await gitInfo();
          const variables = {
            schema: ctx.schema,
            tag,
            gitContext,
            id: getIdFromKey(service),
          };

          ctx.current = await toPromise(
            execute(engineLink, {
              query: UPLOAD_SCHEMA,
              variables,
              context: {
                headers: { ["x-api-key"]: service },
                ...(flags.engine && { uri: flags.engine }),
              },
            })
          )
            .then(async ({ data, errors }) => {
              // XXX better end user error message
              if (errors)
                throw new Error(
                  errors.map(({ message }) => message).join("\n")
                );
              return data!.service.uploadSchema;
            })
            .catch(e => this.error(e.message));
        },
      },
    ]);

    return tasks.run().then(({ current }) => {
      // XXX error on unexpected missing schema
      if (!current) return;
      const result = {
        service: getIdFromKey(service),
        hash: current.tag.schema.hash,
        tag: current.tag.tag,
      };

      if (flags.json) return styledJSON(result);
      this.log("\n");
      if (current.code === "NO_CHANGES") {
        this.log("No change in schema from previous version\n");
      }
      table([result], {
        columns: [
          {
            key: "hash",
            label: "id",
            format: (hash: string) => hash.slice(0, 6),
          },
          { key: "service", label: "schema" },
          { key: "tag" },
        ],
      });
      this.log("\n");
    });
  }
}
