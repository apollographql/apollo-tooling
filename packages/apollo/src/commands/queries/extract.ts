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

import {
  loadQueryDocuments,
  extractOperationsAndFragments,
  combineOperationsAndFragments
} from "apollo-codegen-core/lib/loading";

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
            (flags.queries && [flags.queries]) ||
              ctx.documentSets[0].documentPaths,
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
