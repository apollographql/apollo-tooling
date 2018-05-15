import { Command, flags } from "@oclif/command";
import cli from "cli-ux";
import * as Listr from "listr";
import { createHttpLink } from "apollo-link-http";
import {
  introspectionQuery,
  findBreakingChanges,
  findDangerousChanges,
  buildClientSchema,
  IntrospectionSchema
} from "graphql";
import { toPromise, execute } from "apollo-link";
import fetch from "node-fetch";
import gql from "graphql-tag";

import { SCHEMA_QUERY } from "../../utils/operations/schema";
import { getIdFromKey, engineLink } from "../../utils/engine";

export default class SchemaValidate extends Command {
  static description = "Validate a schema against previous registered schema";

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    service: flags.string({
      char: "s",
      description: "API_KEY for the Engine service"
    }),
    tag: flags.string({
      char: "t",
      description: "The tagged version of the schema to validate against",
      default: "current"
    })
  };

  static args = [{ name: "file" }];

  async run() {
    const { args, flags } = this.parse(SchemaValidate);
    const service = process.env.ENGINE_API_KEY || flags.service;
    if (!service) {
      this.error(
        "No service passed when validating schema. Please pass an Engine API key using `--service=MY_KEY` or adding ENGINE_API_KEY to the environment"
      );
      return;
    }
    const variables = { id: getIdFromKey(service), tag: flags.tag };

    const tasks = new Listr([
      {
        title: "Fetching Schemas",
        task: () =>
          new Listr(
            [
              {
                title: `Fetching ${variables.tag} from Engine`,
                task: async ctx => {
                  ctx.current = await toPromise(
                    execute(engineLink, {
                      query: SCHEMA_QUERY,
                      variables,
                      context: {
                        headers: { ["x-api-key"]: flags.service }
                      }
                    })
                  )
                    .then(({ data, errors }) => {
                      this.log(errors);
                      // XXX better end user error message
                      if (errors) throw new Error(errors);

                      if (!data.service || !data.service.schema)
                        throw new Error(
                          `No schema found for tag "${
                            variables.tag
                          }" under service "${variables.id}"`
                        );

                      return buildClientSchema(data.service.schema);
                    })
                    .catch(e => this.error(e.message));
                }
              },
              {
                title: "Fetching local schema",
                task: async ctx => {
                  ctx.next = await toPromise(
                    execute(
                      createHttpLink({
                        uri: "https://different-actress.glitch.me/",
                        fetch
                      }),
                      {
                        query: gql(introspectionQuery)
                      }
                    )
                  ).then(({ data }) => buildClientSchema(data)); // XXX get from server or file?
                }
              }
            ],
            { concurrent: true }
          )
      },
      {
        title: "Finding breaking changes",
        task: ctx => {
          ctx.breaking = findBreakingChanges(ctx.current, ctx.next);
        }
      },
      {
        title: "Finding dangerous changes",
        task: ctx => {
          ctx.dangerous = findDangerousChanges(ctx.current, ctx.next);
        }
      }
    ]);

    await tasks
      .run()
      .then(({ breaking, dangerous }) => {
        if (breaking.length)
          this.error(
            "Found breaking changes:\n" +
              breaking
                .map(({ type, description }) => `${type}: ${description}`)
                .join("\n")
          );
        if (dangerous.length)
          this.warn(
            "Found potentially dangerous changes:\n" +
              dangerous
                .map(({ type, description }) => `${type}: ${description}`)
                .join("\n")
          );
        if (!breaking.length && !dangerous.length) {
          this.log("No breaking or dangerous changes in this version!");
        }
      })
      .catch(this.error);
  }
}
