import { Command, flags } from "@oclif/command";
import { table, styledJSON } from "heroku-cli-util";
import * as Listr from "listr";
import { toPromise, execute } from "apollo-link";
import { GraphQLError } from "graphql";
import { UPLOAD_SCHEMA } from "../../operations/uploadSchema";
import { getIdFromKey, engineLink } from "../../engine";
import { fetchSchema } from "../../fetch-schema";
import { gitInfo } from "../../git";
import { engineFlags } from "../../engine-cli";
import { loadConfigStep } from "../../load-config";

export default class SchemaPublish extends Command {
  static description = "Publish a schema to Apollo Engine";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help"
    }),
    config: flags.string({
      description: "Path to your Apollo config file"
    }),
    ...engineFlags,
    header: flags.string({
      multiple: true,
      parse: header => {
        const [key, value] = header.split(":");
        return JSON.stringify({ [key.trim()]: value.trim() });
      },
      description: "Additional headers to send to server for introspectionQuery"
    }),
    endpoint: flags.string({
      description: "The URL of the server to fetch the schema from"
    }),
    json: flags.boolean({
      description: "Output successful publish result as JSON"
    }),
    tag: flags.string({
      description: "The tag to publish the schema to",
      default: "current"
    })
  };

  async run() {
    const { flags } = this.parse(SchemaPublish);

    const tasks = new Listr([
      loadConfigStep(flags, true),
      {
        title: "Fetching current schema",
        task: async ctx => {
          if (Object.values(ctx.config.schemas).length > 1) {
            this.error("More than one schema found.");
          }

          if (Object.values(ctx.config.schemas).length == 0) {
            this.error("No schemas found.");
          }

          ctx.currentSchema = Object.values(ctx.config.schemas)[0];
          if (!ctx.currentSchema.engineKey) {
            this.error(
              "No API key was specified. Set an Apollo Engine API key using the `--key` flag or the `ENGINE_API_KEY` environment variable."
            );
          }

          ctx.schema = await fetchSchema(ctx.currentSchema.endpoint).catch(
            this.error
          );
        }
      },
      {
        title: `Publishing to Apollo Engine`,
        task: async (ctx, task) => {
          task.title = `Publishing ${getIdFromKey(
            ctx.currentSchema.engineKey
          )} to Apollo Engine`;
          const gitContext = await gitInfo();
          const variables = {
            schema: ctx.schema,
            tag: flags.tag,
            gitContext,
            id: getIdFromKey(ctx.currentSchema.engineKey)
          };

          ctx.current = await toPromise(
            execute(engineLink, {
              query: UPLOAD_SCHEMA,
              variables,
              context: {
                headers: { ["x-api-key"]: ctx.currentSchema.engineKey },
                ...(ctx.config.engineEndpoint && {
                  uri: ctx.config.engineEndpoint
                })
              }
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
        }
      }
    ]);

    return tasks.run().then(({ current, currentSchema }) => {
      // XXX error on unexpected missing schema
      if (!current) return;
      const result = {
        service: getIdFromKey(currentSchema.engineKey),
        hash: current.tag.schema.hash,
        tag: current.tag.tag
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
            format: (hash: string) => hash.slice(0, 6)
          },
          { key: "service", label: "schema" },
          { key: "tag" }
        ]
      });
      this.log("\n");
    });
  }
}
