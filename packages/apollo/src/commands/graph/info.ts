import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";

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
      description: "Whether to include verbose information about the graph's state",
      default: false,
    }),
  };

  async run() {
    await this.runTasks(({ args, project, flags }) => [
      {
        title: `Collecting graph info from Apollo Graph Manager`,
        task: async () => {
          try {
            const schema = await project.resolveSchema({ tag: flags.tag });
            writeFileSync(
              args.output,
              JSON.stringify(introspectionFromSchema(schema), null, 2)
            );
          } catch (e) {
            if (e.code == "ECONNREFUSED") {
              this.log(chalk.red("ERROR: Connection refused."));
              this.log(
                chalk.red(
                  "You may not be running a service locally, or your endpoint url is incorrect."
                )
              );
              this.log(
                chalk.red(
                  "If you're trying to download a schema from Apollo Engine, use the `client:download-schema` command instead."
                )
              );
            }
            throw e;
          }
        }
      }
    ]);
  }
}
