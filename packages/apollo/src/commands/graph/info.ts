import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";
import { GraphQLProject } from "apollo-language-server";

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
            console.log("foo");
            if (!config.name) {
              throw new Error("No service found to link to Engine");
            }
            const mostRecentCompositionResult = await project.engine.graphInfo({
              id: config.name,
              graphVariant: flags.tag
            });
            if (!mostRecentCompositionResult) {
              // TODO: Support normal shit
              throw new Error(
                "Graph info only supports federated graphs at the moment"
              );
            }
          }
        }
      ]
    );
  }
}
