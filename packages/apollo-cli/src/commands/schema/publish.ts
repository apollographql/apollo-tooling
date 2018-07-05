import { Command, flags } from "@oclif/command";
import cli from "cli-ux";
import { table, styledJSON } from "heroku-cli-util";
import * as Listr from "listr";
import { toPromise, execute } from "apollo-link";
import * as util from "util";
import { GraphQLError } from "graphql";

import { UPLOAD_SCHEMA } from "../../operations/uploadSchema";
import { getIdFromKey, engineLink } from "../../engine";
import { fetchSchema } from "../../fetch-schema";
import { gitInfo } from "../../git";

import { engineFlags } from "../../engine-cli";

export default class SchemaPublish extends Command {
  static description = "Publish a schema to Apollo Engine";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help",
    }),
    ...engineFlags,
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
    json: flags.boolean({
      description: "Output successful publish result as JSON",
    }),
  };

  async run() {
    const { flags } = this.parse(SchemaPublish);
    // hardcoded to current until service / schema / tag is settled
    const tag = "current";

    const apiKey = flags.key;
    if (!apiKey) {
      this.error(
        "No API key was specified. Set an Apollo Engine API key using the `--key` flag or the `ENGINE_API_KEY` environment variable."
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
        title: `Publishing ${getIdFromKey(apiKey)} to Apollo Engine`,
        task: async ctx => {
          const gitContext = await gitInfo();
          const variables = {
            schema: ctx.schema,
            tag,
            gitContext,
            id: getIdFromKey(apiKey),
          };

          ctx.current = await toPromise(
            execute(engineLink, {
              query: UPLOAD_SCHEMA,
              variables,
              context: {
                headers: { ["x-api-key"]: apiKey },
                ...(flags.engine && { uri: flags.engine }),
              },
            })
          )
            .then(async ({ data, errors }) => {
              // XXX better end user error message
              if (errors) {
                console.log(errors);
                throw new Error(
                  errors.map(({ message }) => message).join("\n")
                );
              }
              return data!.service.uploadSchema;
            })
            .catch(e => {
              if (e.result && e.result.errors) {
                this.error(
                  e.result.errors
                    .map(({ message }: GraphQLError) => message)
                    .join("\n")
                );
              } else {
                this.error(e.message);
              }
            });
        },
      },
    ]);

    return tasks.run().then(({ current }) => {
      // XXX error on unexpected missing schema
      if (!current) return;
      const result = {
        service: getIdFromKey(apiKey),
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
