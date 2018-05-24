import { Command, flags } from "@oclif/command";
import cli from "cli-ux";
import { table, styledJSON } from "heroku-cli-util";
import * as Listr from "listr";
import { toPromise, execute } from "apollo-link";

import { UPLOAD_SCHEMA } from "../../operations/uploadSchema";
import { getIdFromKey, engineLink } from "../../engine";
import { fetchSchema } from "../../fetch-schema";
import { gitInfo } from "../../git";

export default class SchemaPublish extends Command {
  static description = "Publish a schema to Engine";

  static flags = {
    help: flags.help({ char: "h" }),
    service: flags.string({
      char: "s",
      description: "ENGINE_API_KEY for the Engine service",
    }),
    header: flags.string({
      multiple: true,
      parse: header => {
        const [key, value] = header.split(":");
        return { [key.trim()]: value.trim() };
      },
      description:
        "Additional headers to send to server for introspectionQuery",
    }),
    endpoint: flags.string({
      char: "e",
      description:
        "The location of the server to from which to fetch the schema",
      default: "http://localhost:4000/graphql", // apollo-server 2.0 default address
    }),
    json: flags.boolean({
      description: "output successful publish result as json",
      default: false,
    }),
  };

  async run() {
    const { flags } = this.parse(SchemaPublish);
    // hardcoded to current until service / schema / tag is settled
    flags.tag = "current";

    const service = process.env.ENGINE_API_KEY || flags.service;
    if (!service) {
      this.error(
        "No service passed when publishing schema. Please pass an Engine API key using `--service=MY_KEY` or adding ENGINE_API_KEY to the environment"
      );
      return;
    }

    const tasks = new Listr([
      {
        title: "Fetching current schema",
        task: async ctx => {
          ctx.schema = await fetchSchema(flags).catch(this.error);
        },
      },
      {
        title: `Publishing schema as tag: ${flags.tag} to Engine`,
        task: async ctx => {
          const gitContext = await gitInfo();
          const variables = { schema: ctx.schema, tag: flags.tag, gitContext };

          ctx.current = await toPromise(
            execute(engineLink, {
              query: UPLOAD_SCHEMA,
              variables,
              context: {
                headers: { ["x-api-key"]: service },
              },
            })
          )
            .then(async ({ data, errors }) => {
              // XXX better end user error message
              if (errors) throw new Error(errors);
              return data.uploadSchema;
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
      return table([result], {
        columns: [
          { key: "service" },
          { key: "hash", format: hash => hash.slice(0, 6) },
          { key: "tag" },
        ],
      });
    });
  }
}
