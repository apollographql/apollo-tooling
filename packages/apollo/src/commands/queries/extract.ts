import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as crypto from "crypto";
import * as fs from "fs";
import { print } from "graphql";

import { loadQueryDocuments } from "apollo-codegen-core/lib/loading";

import { engineFlags } from "../../engine-cli";
import { resolveDocumentSets } from "../../config";
import { loadConfigStep } from "../../load-config";

export default class ExtractQueries extends Command {
  static description = "Extracts queries";

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
    ...engineFlags,

    tagName: flags.string({
      description:
        "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    })
  };

  async run() {
    const { flags } = this.parse(ExtractQueries);

    const tasks: Listr = new Listr([
      loadConfigStep(flags, false),
      {
        title: "Resolving GraphQL document sets",
        task: async (ctx, task) => {
          ctx.documentSets = await resolveDocumentSets(ctx.config, false);
          const operations = loadQueryDocuments(
            ctx.documentSets[0].documentPaths,
            flags.tagName
          );
          task.title = `Scanning for GraphQL queries (${
            operations.length
          } found)`;
          // XXX send along file information as well
          ctx.operations = operations.map(doc => ({ document: print(doc) }));
          // ctx.operations = loadInterpolatedQueries(
          //   (flags.queries && [flags.queries]) || ctx.documentSets[0].documentPaths,
          //   flags.tagName
          // );

          task.title = `Scanning for GraphQL queries (${
            ctx.operations.length
          } found)`;
          // XXX send along file information as well
        }
      },
      {
        title: "Generating hashes",
        task: async ctx => {
          ctx.mapping = {};
          console.log(ctx.operations);
          (ctx.operations as Array<string>).forEach(operation => {
            ctx.mapping[
              crypto
                .createHash("sha512")
                .update(operation)
                .digest("hex")
            ] = operation;
          });
        }
      },
      {
        title: "Outputing manifest",
        task: async ctx => {
          fs.writeFileSync("manifest.json", JSON.stringify(ctx.mapping));
        }
      }
    ]);

    return tasks.run();
  }
}
