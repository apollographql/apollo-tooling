import { Command, flags } from "@oclif/command";
import chalk from "chalk";
import { color, table, styledJSON } from "heroku-cli-util";
import cli from "cli-ux";
import * as Listr from "listr";

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
  static description = "Check a schema against previous registered schema";

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
        return JSON.stringify({ [key.trim()]: value.trim() });
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
      description: "output result as json",
    }),
  };

  async run() {
    const { flags } = this.parse(SchemaCheck);
    const service = process.env.ENGINE_API_KEY || flags.service;
    if (!service) {
      this.error(
        "No service passed when checking schema. Please pass an Engine API key using `--service=MY_KEY` or adding ENGINE_API_KEY to the environment"
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
            id: getIdFromKey(service),
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
                headers: { ["x-api-key"]: service },
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
              this.error(e.message);
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
      table(changes.sort(sorter).map(format), {
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

const sorter = (a: Change, b: Change) => {
  if (a.type === b.type) return 0;
  if (b.type === ChangeType.FAILURE) return 1;
  if (b.type === ChangeType.WARNING) return 1;
  if (b.type === ChangeType.NOTICE) return -1;
  return 0;
};
