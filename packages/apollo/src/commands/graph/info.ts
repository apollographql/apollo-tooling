import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";
import { DefaultEngineConfig, GraphQLProject } from "apollo-language-server";
import { table } from "table";
import {
  CurrentGraphInformation_service,
  CurrentGraphInformation_service_mostRecentCompositionPublish
} from "apollo-language-server/lib/graphqlTypes";
import { formatServiceListHumanReadable } from "../service/list";

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
            consoleResult += `Graph ${chalk.cyan(
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

            if (
              currentGraphInfo.implementingServices &&
              "services" in currentGraphInfo.implementingServices
            ) {
              consoleResult += ` is federated with ${chalk.cyan(
                `${currentGraphInfo.implementingServices.services.length} implementing services.\n`
              )}`;
              if (flags.verbose) {
                consoleResult += formatServiceListHumanReadable({
                  implementingServices: currentGraphInfo.implementingServices as any,
                  graphName: config.name,
                  frontendUrl:
                    config.engine.frontend || DefaultEngineConfig.frontend
                });
              }
              if (!currentGraphInfo.mostRecentCompositionPublish) {
                consoleResult += `No managed configuration has been pushed to the graph.\n`;
              } else {
                const compResult =
                  currentGraphInfo.mostRecentCompositionPublish;
                if (compResult.errors && compResult.errors.length) {
                  consoleResult +=
                    "Current services fail to compose. Composition errors" +
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
                    "See https://www.apollographql.com/docs/apollo-server/federation/errors/ for more information.\n";
                }
              }
            } else {
              consoleResult += ` is not federated.\n`;
            }

            compositionResult = currentGraphInfo.mostRecentCompositionPublish;
            this.log("\n");
            return;
          }
        }
      ]
    );

    this.log(consoleResult);
    this.log("\n");

    if (!compositionResult) {
      throw new Error("unreachable code");
    }
    if (
      compositionResult &&
      compositionResult!.errors &&
      compositionResult!.errors.length
    ) {
      this.log(
        `Current services fail to compose. See composition errors below:\n`
      );
      const messages = [
        ...compositionResult!.errors.map(({ message }) => ({
          type: chalk.red("Error"),
          description: message
        }))
      ].filter(x => x !== null);

      this.log(
        table([["Severity", "Description"], ...messages.map(Object.values)], {
          columns: { 1: { width: 70, wrapWord: true } }
        })
      );
      return;
    }

    // otherwise, indicate lastUpdatedAt
  }
}
