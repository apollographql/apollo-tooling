import "apollo-codegen-core/lib/polyfills";
import { Command, flags } from "@oclif/command";
import { table, styledJSON } from "heroku-cli-util";
import * as Listr from "listr";
import { toPromise, execute } from "apollo-link";
import { print, GraphQLError, DocumentNode } from "graphql";
import * as fg from "glob";

import {
  loadQueryDocuments,
  extractOperationsAndFragments,
  combineOperationsAndFragments
} from "apollo-codegen-core/lib/loading";
import { withGlobalFS } from "apollo-codegen-core/lib/localfs";

import { engineFlags } from "../../engine-cli";
import { engineLink, getIdFromKey } from "../../engine";
import { gitInfo } from "../../git";
import { VALIDATE_OPERATIONS } from "../../operations/validateOperations";
import { ChangeType } from "../../printer/ast";
import { format } from "../schema/check";
import { resolveDocumentSets } from "../../config";
import { loadConfigStep } from "../../load-config";

export default class CheckQueries extends Command {
  static description =
    "Checks your GraphQL operations for compatibility with the server. Checks against the published schema in Apollo Engine.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help"
    }),
    config: flags.string({
      description: "Path to your Apollo config file"
    }),
    queries: flags.string({
      description:
        "Path to your GraphQL queries, can include search tokens like **"
    }),
    json: flags.boolean({
      description: "Output result as JSON"
    }),
    ...engineFlags,

    tagName: flags.string({
      description:
        "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    })
  };

  async run() {
    const { flags } = this.parse(CheckQueries);

    const tasks: Listr = new Listr([
      loadConfigStep(flags, false),
      {
        title: "Resolving GraphQL document sets",
        task: async ctx => {
          ctx.documentSets = await resolveDocumentSets(ctx.config, false);
        }
      },
      {
        title: "Scanning for GraphQL queries",
        task: async (ctx, task) => {
          ctx.queryDocuments = loadQueryDocuments(
            typeof flags.queries === "string"
              ? [
                  withGlobalFS(() =>
                    fg.sync(flags.queries!, {
                      cwd: ctx.config.projectFolder,
                      absolute: true
                    })
                  )
                ]
              : ctx.documentSets[0].documentPaths,
            flags.tagName
          );
          task.title = `Scanning for GraphQL queries (${
            ctx.queryDocuments.length
          } found)`;
        }
      },
      {
        title: "Isolating operations and fragments",
        task: async ctx => {
          const { fragments, operations } = extractOperationsAndFragments(
            ctx.queryDocuments,
            this.error.bind(this)
          );
          ctx.fragments = fragments;
          ctx.operations = operations;
        }
      },
      {
        title: "Combining operations and fragments",
        task: async ctx => {
          ctx.fullOperations = combineOperationsAndFragments(
            ctx.operations,
            ctx.fragments,
            this.error.bind(this)
          );
        }
      },
      {
        title: "Printing operations",
        task: async ctx => {
          // XXX send along file information as well
          ctx.operations = (ctx.fullOperations as Array<DocumentNode>).map(
            doc => ({
              document: print(doc)
            })
          );
        }
      },
      {
        title: "Checking query compatibility with schema",
        task: async ctx => {
          if (!ctx.documentSets[0].engineKey) {
            this.error(
              "No API key was specified. Set an Apollo Engine API key using the `--key` flag or the `ENGINE_API_KEY` environment variable."
            );
          }

          const gitContext = await gitInfo();

          const variables = {
            id: getIdFromKey(ctx.documentSets[0].engineKey),
            // XXX hardcoded for now
            tag: "current",
            gitContext,
            operations: ctx.operations
          };

          ctx.changes = await toPromise(
            execute(engineLink, {
              query: VALIDATE_OPERATIONS,
              variables,
              context: {
                headers: { ["x-api-key"]: ctx.documentSets[0].engineKey },
                ...(ctx.config.engineEndpoint && {
                  uri: ctx.config.engineEndpoint
                })
              }
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
              return data!.service.schema.checkOperations;
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

    return tasks.run().then(async ({ changes }) => {
      const failures = changes.filter(
        ({ type }: { type: ChangeType }) => type === ChangeType.FAILURE
      );
      const exit = failures.length > 0 ? 1 : 0;
      if (flags.json) {
        await styledJSON({ changes });
        // exit with failing status if we have failures
        this.exit(exit);
      }
      if (changes.length === 0) {
        return this.log(
          "\nNo operations have issues with the current schema\n"
        );
      }
      this.log("\n");
      table(changes.map(format), {
        columns: [
          { key: "type", label: "Change" },
          { key: "code", label: "Code" },
          { key: "description", label: "Description" }
        ]
      });
      this.log("\n");
      // exit with failing status if we have failures
      this.exit(exit);
    });
  }
}
