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

import { VALIDATE_SCHEMA } from "../../operations/validateSchema";
import { engineLink, getIdFromKey } from "../../engine";

export default class SchemaCheck extends Command {
  static description = "Check a schema against previous registered schema";

  static flags = {
    help: flags.help({ char: "h" }),
    // flag with a value (-n, --name=VALUE)
    service: flags.string({
      char: "s",
      description: "API_KEY for the Engine service",
    }),
    tag: flags.string({
      char: "t",
      description: "The tagged version of the schema to compare against",
      default: "current",
    }),
    schema: flags.string({
      description: "The location of the schema or introspection query result",
      default: "http://localhost:4000/graphql", // apollo-server 2.0 default address
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

    const tasks = new Listr([
      {
        title: "Fetching local schema",
        task: async ctx => {
          ctx.schema = await toPromise(
            execute(createHttpLink({ uri: flags.schema, fetch }), {
              query: gql(introspectionQuery),
            })
          ).then(({ data }) => data); // XXX get from server or file?
        },
      },
      {
        title: "Checking Schema",
        task: async ctx => {
          // XXX pull from CI which is way eaiser and more reliable
          // const repo = await NodeGit.Repository.open(process.cwd());
          // const [commit, remote] = await Promise.all([
          //   repo.getHeadCommit(),
          //   repo.getRemote("origin"),
          // ]);
          // const { owner, name } = parseRemote(remote.url());
          // const git = {
          //   sha: commit.sha(),
          //   owner,
          //   repo: name,
          // };

          const variables = {
            id: getIdFromKey(service),
            schema: ctx.schema.__schema,
            tag: flags.tag,
            // git,
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
              console.log(data);
              // XXX better end user error message
              if (errors) throw new Error(errors);

              return data.service.schema.checkSchema;
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
        console.log(changes);
        // const breaking = changes.filter(({ type }) => type === "BREAKING");
        // const dangerous = changes.filter(({ type }) => type === "DANGEROUS");
        // if (breaking.length)
        //   this.error(
        //     "Found breaking changes:\n" +
        //       breaking
        //         .map(({ code, description }) => `${code}: ${description}`)
        //         .join("\n")
        //   );
        // if (dangerous.length)
        //   this.warn(
        //     "Found potentially dangerous changes:\n" +
        //       dangerous
        //         .map(({ code, description }) => `${code}: ${description}`)
        //         .join("\n")
        //   );
        // if (!breaking.length && !dangerous.length) {
        //   this.log("No breaking or dangerous changes in this version!");
        // }
      })
      .catch(this.error);
  }
}
