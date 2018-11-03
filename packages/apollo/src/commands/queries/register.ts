import "apollo-env";

import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import {
  getCommonTasks,
  getCommonManifestTasks
} from "../../helpers/commands/queries/commonTasks";
import { engineFlags } from "../../engine-cli";
import { loadConfigStep } from "../../load-config";
import { toPromise, execute } from "apollo-link";
import { GraphQLError } from "graphql";
import { REGISTER_OPERATIONS } from "../../operations/registerOperations";
import { getIdFromKey, engineLink } from "../../engine";
import * as assert from "assert";

export default class RegisterQueries extends Command {
  static description = "Register queries";

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
    addTypename: flags.boolean({
      description: "Automatically add __typename to your queries",
      allowNo: true
    }),
    removeClientDirectives: flags.boolean({
      allowNo: true,
      description:
        "Automatically remove @client and @connection directives and fields from operations"
    }),
    // XXX abstract for "clientFlags" and add to config
    clientIdentifier: flags.string({
      description:
        "Identifier for the client which will match ids from client traces, will use clientName if not provided"
    }),
    clientName: flags.string({
      required: true,
      description: "Name of the client that the queries will be attached to"
    }),
    clientVersion: flags.string({
      description:
        "The version of the client that the queries will be attached to"
    }),
    ...engineFlags,

    tagName: flags.string({
      description:
        "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    })
  };

  async run() {
    let { flags } = this.parse(RegisterQueries);

    // oclif doesn't let setting boolean flags to be default
    const defaultFlags = { addTypename: true, removeClientDirectives: true };
    flags = { ...defaultFlags, ...flags };

    const tasks: Listr = new Listr([
      loadConfigStep(flags, false),
      {
        title: "Loading schema",
        task: ctx => {
          // TODO: Aside from a confusing approach for finding the `--key`, this needs to be DRYed up since
          // its logic is repeated in many places now.  Since the precedent has already been created by
          // past contributors though, this pattern will be further perpetuated (Thanks?).
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
        }
      },
      ...getCommonTasks({ flags, errorLogger: this.error.bind(this) }),
      ...getCommonManifestTasks({ flags }),
      {
        title: "Registering operations with Apollo Engine",
        task: async (ctx, task) => {
          task.title =
            task.title +
            ` service ${getIdFromKey(ctx.currentSchema.engineKey)}`;

          // Ensure that the manifest is included on the context.
          assert.notStrictEqual(typeof ctx.manifest, "undefined");

          if (!ctx.manifest.operations || !ctx.manifest.operations.length) {
            throw new Error("No operations were found.");
          }

          const variables = {
            clientIdentity: {
              name: flags.clientName,
              identifier: flags.clientIdentifier || flags.clientName,
              version: flags.clientVersion
            },
            serviceId: getIdFromKey(ctx.currentSchema.engineKey),
            operations: ctx.manifest.operations
          };

          await toPromise(
            execute(engineLink, {
              query: REGISTER_OPERATIONS,
              variables,
              context: {
                headers: { ["x-api-key"]: ctx.currentSchema.engineKey },
                ...(ctx.config.engineEndpoint && {
                  uri: ctx.config.engineEndpoint
                })
              }
            })
          )
            .then(({ data, errors }) => {
              // XXX better end user error message
              if (!errors) {
                return data!.service.registerOperations;
              }

              throw new Error(errors.map(({ message }) => message).join("\n"));
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

    return await tasks.run();
  }
}
