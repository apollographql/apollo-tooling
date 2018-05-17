import { Command, flags } from "@oclif/command";
import { createHttpLink } from "apollo-link-http";
import cli from "cli-ux";
import * as Listr from "listr";
import {
  introspectionQuery,
  findBreakingChanges,
  buildClientSchema,
  IntrospectionSchema,
} from "graphql";
import { toPromise, execute } from "apollo-link";
import fetch from "node-fetch";
import gql from "graphql-tag";

import { UPLOAD_SCHEMA } from "../../utils/operations/uploadSchema";
import { getIdFromKey, engineLink } from "../../utils/engine";

export default class SchemaUpload extends Command {
  static description = "Upload a schema to Engine";

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    service: flags.string({
      char: "s",
      description: "API_KEY for the Engine service",
    }),
    tag: flags.string({
      char: "t",
      description: "The tag for this version of the schema",
      default: "current",
    }),
  };

  async run() {
    const { flags } = this.parse(SchemaUpload);
    const service = process.env.ENGINE_API_KEY || flags.service;
    if (!service) {
      this.error(
        "No service passed when uploading schema. Please pass an Engine API key using `--service=MY_KEY` or adding ENGINE_API_KEY to the environment"
      );
      return;
    }

    const tasks = new Listr([
      {
        title: "Fetching current schema",
        task: async ctx => {
          ctx.schema = await toPromise(
            execute(
              createHttpLink({
                uri: "https://different-actress.glitch.me/",
                fetch,
              }),
              {
                query: gql(introspectionQuery),
              }
            )
          )
            .then(({ data, errors }) => {
              if (errors) throw new Error(errors);

              return data.__schema;
            })
            .catch(e => {
              this.error(e);
              this.exit();
            }); // XXX get from server or file?
        },
      },
      {
        title: `Uploading ${flags.tag} to Engine`,
        task: async ctx => {
          const variables = { schema: ctx.schema, tag: flags.tag };

          ctx.current = await toPromise(
            execute(engineLink, {
              query: UPLOAD_SCHEMA,
              variables,
              context: {
                headers: { ["x-api-key"]: service },
              },
            })
          )
            .then(({ data, errors }) => {
              // XXX better end user error message
              if (errors) throw new Error(errors);
              return data.uploadSchema;
            })
            .catch(e => this.error(e.message));
        },
      },
    ]);

    tasks.run().then(({ current }) => {
      if (!current) return;

      this.log(`Schema successfully uploaded to Engine!`);
      this.log(`Schema version: ${current.hash}`);
      // cli.url(
      //   "View in Engine",
      //   `https://engine.apollographql.com/service/${getIdFromKey(
      //     service
      //   )}?tab=overview&schema=${current.hash}`
      // );
    });
  }
}
