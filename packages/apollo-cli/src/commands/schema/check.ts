import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import { color, table, styledJSON } from "heroku-cli-util";
import cli from "cli-ux";
import * as Listr from "listr";
import { GraphQLError } from "graphql";

import { toPromise, execute } from "apollo-link";

import { VALIDATE_SCHEMA } from "../../operations/validateSchema";
import { engineLink, getIdFromKey } from "../../engine";
import { fetchSchema } from "../../fetch-schema";
import { gitInfo } from "../../git";
import { ChangeType } from "../../printer/ast";

// how its brought down from schema
interface Change {
  type: ChangeType;
  code: string;
  description: string;
}

export default class SchemaCheck extends Command {
  static description = "Check a schema against the version registered in Apollo Engine.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help",
    }),
    key: flags.string({
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
      description: "The URL of the server to fetch the schema from",
      default: "http://localhost:4000/graphql", // apollo-server 2.0 default address
    }),
    json: flags.boolean({
      description: "Output result as JSON",
    }),
    engine: flags.string({
      description: "Reporting URL for a custom Apollo Engine deployment",
      hidden: true,
    }),
  };

  async run() {
    const { flags } = this.parse(SchemaCheck);
    const apiKey = process.env.ENGINE_API_KEY || flags.key;
    if (!apiKey) {
      this.error(
        "No API key was specified. Set an Apollo Engine API key using the `--key` flag or the `ENGINE_API_KEY` environment variable."
      );
      return;
    }

    const header = Array.isArray(flags.header) ? flags.header : [flags.header];
    const tasks = new Listr([
      {
        title: "Fetching local schema",
        task: async ctx => {
          ctx.schema = await fetchSchema({
            endpoint: flags.endpoint,
            header: header.filter(x => Boolean(x)).map(x => JSON.parse(x)),
          });
        },
      },
      {
        title: "Checking schema for changes",
        task: async ctx => {
          const gitContext = await gitInfo();

          const variables = {
            id: getIdFromKey(apiKey),
            schema: ctx.schema,
            // XXX hardcoded for now
            tag: "current",
            gitContext,
          };

          ctx.changes = await toPromise(
            execute(engineLink, {
              query: VALIDATE_SCHEMA,
              variables,
              context: {
                headers: { ["x-api-key"]: apiKey },
                ...(flags.engine && { uri: flags.engine }),
              },
            })
          )
            .then(({ data, errors }) => {
              // XXX better end user error message
              if (errors)
                throw new Error(
                  errors.map(({ message }) => message).join("\n")
                );
              if (!data!.service)
                throw new Error(`No schema found for ${variables.id}`);
              return data!.service.schema.checkSchema.changes;
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

    return tasks.run().then(async ({ changes }) => {
      const failures = changes.filter(
        ({ type }: Change) => type === ChangeType.FAILURE
      );
      const exit = failures.length > 0 ? 1 : 0;
      if (flags.json) {
        await styledJSON({ changes });
        // exit with failing status if we have failures
        this.exit(exit);
      }
      if (changes.length === 0) {
        return this.log("\nNo changes present between schemas\n");
      }
      this.log("\n");
      table(changes.map(format), {
        columns: [
          { key: "type", label: "Change" },
          { key: "code", label: "Code" },
          { key: "description", label: "Description" },
        ],
      });
      this.log("\n");
      // exit with failing status if we have failures
      this.exit(exit);
    });
  }
}

const format = (change: Change) => {
  let color = (x: string): string => x;
  if (change.type === ChangeType.FAILURE) {
    color = chalk.red;
  }
  if (change.type === ChangeType.WARNING) {
    color = chalk.yellow;
  }

  return {
    type: color(change.type),
    code: color(change.code),
    description: color(change.description),
  };
};
