// provides flatMap
import "apollo-codegen-core/lib/polyfills";

import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as crypto from "crypto";
import * as fs from "fs";
import { DocumentNode } from "graphql";
import {
  hideLiterals,
  printWithReducedWhitespace,
  sortAST
} from "apollo-engine-reporting";

import { getCommonTasks } from "../../helpers/commands/queries/commonTasks";

import { engineFlags } from "../../engine-cli";

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

  static args = [
    {
      name: "output",
      description: "Path to write the extracted queries to",
      required: true,
      default: "manifest.json"
    }
  ];

  async run() {
    const { flags, args } = this.parse(ExtractQueries);

    const tasks: Listr = new Listr([
      loadConfigStep(flags, false),
      ...getCommonTasks({ flags, errorLogger: this.error.bind(this) }),
      {
        title: "Normalizing Operations",
        task: async ctx => {
          ctx.normalizedOperations = (ctx.fullOperations as Array<
            DocumentNode
          >).map(operation =>
            // While this could include dropping unused definitions, they are
            // kept because the registered operations should mirror those in the
            // client bundle minus any PPI. This provides more predictability
            // and allows a better understanding of where a query comes from.
            printWithReducedWhitespace(sortAST(hideLiterals(operation)))
          );
        }
      },
      {
        title: "Generating hashes",
        task: async ctx => {
          ctx.mapping = {};
          (ctx.normalizedOperations as Array<string>).forEach(operation => {
            ctx.mapping[
              crypto
                .createHash("sha512")
                .update(operation)
                .digest("base64")
            ] = operation;
          });
        }
      },
      {
        title: "Outputing extracted queries",
        task: async (ctx, task) => {
          const filename = args.output;
          task.title = "Outputing extracted queries to " + filename;
          fs.writeFileSync(filename, JSON.stringify(ctx.mapping));
        }
      }
    ]);

    return tasks.run();
  }
}
