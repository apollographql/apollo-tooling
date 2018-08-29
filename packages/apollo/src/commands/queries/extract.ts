import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as crypto from "crypto";
import * as fs from "fs";
import {
  DocumentNode,
  visit,
  Kind,
  OperationDefinitionNode,
  FragmentDefinitionNode
} from "graphql";
import {
  hideLiterals,
  printWithReducedWhitespace,
  sortAST
} from "apollo-engine-reporting";

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
          // XXX send along file information as well
          // ctx.operations = operations.map(doc => ({ document: print(doc) }));
          // ctx.operations = loadInterpolatedQueries(
          //   (flags.queries && [flags.queries]) || ctx.documentSets[0].documentPaths,
          //   flags.tagName
          // );
          // XXX send along file information as well
        }
      },
      {
        title: "Isolating operations and fragments",
        task: async ctx => {
          ctx.fragments = {};
          ctx.operations = [] as Array<DocumentNode>;

          (ctx.queryDocuments as Array<DocumentNode>).forEach(operation => {
            // We could use separateOperations from graphql-js in the case that
            // all fragments are defined in the same file. Currently this
            // solution duplicates much of the logic, adding the ability to pull
            // fragments from separate files
            visit(operation, {
              [Kind.FRAGMENT_DEFINITION]: node => {
                if (!node.name || node.name.kind !== "Name") {
                  this.error(`Fragment Definition must have a name ${node}`);
                }

                if (ctx.fragments[node.name.value]) {
                  this.error(
                    `Duplicate definition of fragment ${
                      node.name.value
                    }. Please rename one of them or use the same fragment`
                  );
                }
                ctx.fragments[node.name.value] = node;
              },
              [Kind.OPERATION_DEFINITION]: node => {
                ctx.operations.push(node);
              }
            });
          });
        }
      },
      {
        title: "Combining operations and fragments",
        task: async ctx => {
          ctx.fullOperations = [];
          (ctx.operations as Array<OperationDefinitionNode>).forEach(
            operation => {
              const completeOperation: Array<
                OperationDefinitionNode | FragmentDefinitionNode
              > = [operation];

              visit(operation, {
                [Kind.FRAGMENT_SPREAD]: node => {
                  if (!node.name || node.name.kind !== "Name") {
                    this.error(`Fragment Spread must have a name ${node}`);
                  }
                  if (!ctx.fragments[node.name.value]) {
                    this.error(
                      `Fragment ${
                        node.name.value
                      } is not defined. Please add the file containing the fragment to the set of included paths`
                    );
                  }
                  completeOperation.push(ctx.fragments[node.name.value]);
                }
              });

              ctx.fullOperations.push({
                kind: "Document",
                definitions: completeOperation
              } as DocumentNode);
            }
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
        title: "Outputing manifest",
        task: async ctx => {
          fs.writeFileSync("manifest.json", JSON.stringify(ctx.mapping));
        }
      }
    ]);

    return tasks.run();
  }
}
