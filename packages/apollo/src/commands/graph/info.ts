import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";
import { GraphQLProject } from "apollo-language-server";

export default class GraphInfo extends ProjectCommand {
  static aliases = ["schema:download"];
  static description = "Download the schema from your GraphQL endpoint.";

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
            if (!config.name) {
              throw new Error("No service found to link to Engine");
            }
            const graphInfo = await project.engine.graphInfo({
              id: config.name,
              graphVariant: flags.tag
            });
            const schema = await project.resolveSchema({ tag: flags.tag });
            writeFileSync(
              args.output,
              JSON.stringify(introspectionFromSchema(schema), null, 2)
            );
            console.log("graphInfo", graphInfo);
          }
        }
      ]
    );
  }
}
