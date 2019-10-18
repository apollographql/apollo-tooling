import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";
import { DefaultEngineConfig, GraphQLProject } from "apollo-language-server";
import { table } from "table";
import moment from "moment";
import {
  CurrentGraphInformation_service,
  CurrentGraphInformation_service_mostRecentCompositionPublish
} from "apollo-language-server/lib/graphqlTypes";
import { formatServiceListHumanReadable } from "../service/list";

export function formatDateHumanReadable(date: Date) {
  return `${moment(date).format("D MMMM YYYY")} (${moment(date).from(
    new Date()
  )})`;
}

export default class GraphInfo extends ProjectCommand {
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      name: "tag",
      char: "t",
      description: "The published tag to check this service against",
      default: "current"
    }),
    verbose: flags.boolean({
      name: "verbose",
      char: "v",
      description:
        "Whether to include verbose information about the graph's state",
      default: false
    })
  };
  async run() {
    let consoleResult: string = "\n";
    let compositionResult: CurrentGraphInformation_service_mostRecentCompositionPublish | null = null;
    await this.runTasks(
      ({
        args,
        project,
        flags,
        config
      }: {
        args: any;
        project: GraphQLProject;
        flags: any;
        config: any;
      }) => [
        {
          title: `Collecting graph info from Apollo Graph Manager`,
          task: async () => {
            if (!config.name) {
              throw new Error("No graph found to link to Graph Manager");
            }
            consoleResult += ` • Graph ${chalk.cyan(
              config.name + "@" + config.tag
            )}`;
            const currentGraphInfo: CurrentGraphInformation_service | null = await project.engine.graphInfo(
              {
                id: config.name,
                graphVariant: config.tag
              }
            );
            if (!currentGraphInfo) {
              consoleResult +=
                "Error: Could not find graph info from Graph Manager\n";
              if (flags.verbose) {
                consoleResult += `raw JSON: ${JSON.stringify(
                  currentGraphInfo,
                  null,
                  2
                )}`;
              }
              return;
            }
            consoleResult += ` (account: ${
              currentGraphInfo.account
                ? currentGraphInfo.account.name
                : "NO_ACCOUNT"
            })`;

            if (
              currentGraphInfo.implementingServices &&
              "services" in currentGraphInfo.implementingServices
            ) {
              consoleResult += ` is federated with ${chalk.cyan(
                `${currentGraphInfo.implementingServices.services.length} implementing services`
              )}.\n`;
              if (flags.verbose) {
                consoleResult += "\nSERVICE LIST\n";
                consoleResult += formatServiceListHumanReadable({
                  implementingServices: currentGraphInfo.implementingServices as any,
                  graphName: config.name,
                  frontendUrl:
                    config.engine.frontend || DefaultEngineConfig.frontend
                });
                consoleResult += "\n";
              }
              if (!currentGraphInfo.mostRecentCompositionPublish) {
                consoleResult += ` • No managed configuration has been pushed to the graph.\n`;
              } else {
                const compResult =
                  currentGraphInfo.mostRecentCompositionPublish;
                if (compResult.errors && compResult.errors.length) {
                  consoleResult +=
                    " • Current services fail to compose. Composition errors" +
                    " must be resolved before the gateway can be updated.\n";
                  const messages = [
                    ...compResult.errors.map(({ message }) => ({
                      type: chalk.red("Error"),
                      description: message
                    }))
                  ];
                  consoleResult += table(
                    [
                      ["Severity", "Description"],
                      ...messages.map(Object.values)
                    ],
                    {
                      columns: { 1: { width: 70, wrapWord: true } }
                    }
                  );
                  consoleResult +=
                    "See https://www.apollographql.com/docs/apollo-server/federation/errors/ for more information.\n\n";
                }
              }
            } else {
              consoleResult += ` is not federated.\n`;
            }

            if (currentGraphInfo.lastReportedAt) {
              consoleResult += ` • Last metrics reported at ${formatDateHumanReadable(
                currentGraphInfo.lastReportedAt
              )}.\n`;
            } else {
              consoleResult +=
                " • No metrics reported to graph [see https://www.apollographql.com/docs/references/setup-analytics/ for setup].\n";
            }

            if (
              currentGraphInfo.schemaTag &&
              currentGraphInfo.schemaTag.publishedAt
            ) {
              consoleResult += ` • Latest schema published at ${formatDateHumanReadable(
                currentGraphInfo.schemaTag.publishedAt
              )}.\n`;
            } else {
              consoleResult += ` • No schema published to graph [see https://www.apollographql.com/docs/graph-manager/schema-registry/#using-the-schema-registry for setup].\n`;
            }

            compositionResult = currentGraphInfo.mostRecentCompositionPublish;
            this.log("\n");
            return;
          }
        }
      ]
    );

    this.log(consoleResult);
  }
}
