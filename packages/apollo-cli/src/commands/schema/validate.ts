import { Command, flags } from "@oclif/command";
import cli from "cli-ux";
import * as Listr from "listr";
import { createHttpLink } from "apollo-link-http";
import * as NodeGit from "nodegit";
import * as parseRemote from "parse-github-url";
import {
  introspectionQuery,
  findBreakingChanges,
  findDangerousChanges,
  buildClientSchema,
  IntrospectionSchema,
} from "graphql";
import { toPromise, execute } from "apollo-link";
import fetch from "node-fetch";
import gql from "graphql-tag";

import { VALIDATE_SCHEMA } from "../../utils/operations/validateSchema";
import { engineLink } from "../../utils/engine";

export default class SchemaValidate extends Command {
  static description = "Validate a schema against previous registered schema";

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    service: flags.string({
      char: "s",
      description: "API_KEY for the Engine service",
    }),
    tag: flags.string({
      char: "t",
      description: "The tagged version of the schema to validate against",
      default: "current",
    }),
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

    const tasks = new Listr([
      {
        title: "Fetching local schema",
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
          ).then(({ data }) => data); // XXX get from server or file?
        },
      },
      {
        title: "Validating Schema",
        task: async ctx => {
          // XXX pull from CI which is way eaiser and more reliable
          const repo = await NodeGit.Repository.open(process.cwd());
          const [commit, remote] = await Promise.all([
            repo.getHeadCommit(),
            repo.getRemote("origin"),
          ]);
          const { owner, name } = parseRemote(remote.url());
          const git = {
            sha: commit.sha(),
            owner,
            repo: name,
          };

          const variables = {
            schema: ctx.schema.__schema,
            tag: flags.tag,
            git,
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
              console.log(errors);
              // XXX better end user error message
              if (errors) throw new Error(errors);
              if (!data.validateSchema.success)
                throw new Error(data.validateSchema.message);

              return data.validateSchema.validations;
            })
            .catch(e => {
              console.log(e);
              this.error(e.message);
            });
        },
      },
    ]);

    await tasks
      .run()
      .then(({ changes }) => {
        const breaking = changes.filter(({ type }) => type === "BREAKING");
        const dangerous = changes.filter(({ type }) => type === "DANGEROUS");
        if (breaking.length)
          this.error(
            "Found breaking changes:\n" +
              breaking
                .map(({ code, description }) => `${code}: ${description}`)
                .join("\n")
          );
        if (dangerous.length)
          this.warn(
            "Found potentially dangerous changes:\n" +
              dangerous
                .map(({ code, description }) => `${code}: ${description}`)
                .join("\n")
          );
        if (!breaking.length && !dangerous.length) {
          this.log("No breaking or dangerous changes in this version!");
        }
      })
      .catch(this.error);
  }
}
