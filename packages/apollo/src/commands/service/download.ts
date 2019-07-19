import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";

export default class ServiceDownload extends ProjectCommand {
  static aliases = ["schema:download"];
  static description = "Download the schema from your GraphQL endpoint.";

  static flags = {
    ...ProjectCommand.flags,
    ...ProjectCommand.variantFlags,
    skipSSLValidation: flags.boolean({
      char: "k",
      description: "Allow connections to an SSL site without certs"
    })
  };

  static args = [
    {
      name: "output",
      description: "Path to write the introspection result to",
      required: true,
      default: "schema.json"
    }
  ];

  async run() {
    let result;
    let gitContext;
    await this.runTasks(({ args, project, flags, config }) => [
      {
        title: `Saving schema to ${args.output}`,
        task: async () => {
          try {
            const schema = await project.resolveSchema({
              tag: config.variant
            });
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
