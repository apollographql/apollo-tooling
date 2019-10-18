import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";
import { GraphQLProject } from "apollo-language-server";
import { table } from "table";
import {
  CurrentGraphInformation_service,
  CurrentGraphInformation_service_mostRecentCompositionPublish
} from "apollo-language-server/lib/graphqlTypes";

export default class GraphInfo extends ProjectCommand {
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to check this service against",
      default: "current"
    }),
    verbose: flags.boolean({
      char: "v",
      description:
        "Whether to include verbose information about the graph's state",
      default: false
    })
  };
  async run() {
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
              throw new Error("No service found to link to Engine");
            }
            this.log(`Graph: ${chalk.cyan(config.name + "@" + config.tag)}`);
            const currentGraphInfo: CurrentGraphInformation_service | null = await project.engine.graphInfo(
              {
                id: config.name,
                graphVariant: config.tag
              }
            );
            if (!currentGraphInfo) {
              // TODO
              throw new Error("gtfo");
            }
            if (!currentGraphInfo.mostRecentCompositionPublish) {
              // TODO: Support normal shit
              throw new Error(
                "Graph info only supports federated graphs at the moment"
              );
            }
            compositionResult = currentGraphInfo.mostRecentCompositionPublish;
            this.log("\n");
            return;
          }
        }
      ]
    );

    if (!compositionResult) {
      throw new Error("unreachable code");
    }
    if (
      compositionResult &&
      compositionResult.errors &&
      compositionResult.errors.length
    ) {
      this.log(
        `Current services fail to compose. See composition errors below:\n`
      );
      const messages = [
        ...compositionResult.errors.map(({ message }) => ({
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
