import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";
import mkdirp from "mkdirp";
import fs from "fs";
import { dirname as getDirName } from "path";

export default class ServiceDownload extends ProjectCommand {
  static aliases = ["schema:download"];
  static description =
    "[DEPRECATED] Download the schema from your GraphQL endpoint." +
    ProjectCommand.DEPRECATION_MSG;

  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description:
        "[Deprecated: please use --variant instead] The tag (AKA variant) to download the schema of",
      hidden: true,
      exclusive: ["variant"],
    }),
    variant: flags.string({
      char: "v",
      description: "The variant to download the schema of",
      exclusive: ["tag"],
    }),
    graph: flags.string({
      char: "g",
      description:
        "The ID of the graph in the Apollo registry for which to download the schema for. Overrides config file if provided.",
    }),
    skipSSLValidation: flags.boolean({
      char: "k",
      description: "Allow connections to an SSL site without certs",
    }),
  };

  static args = [
    {
      name: "output",
      description:
        "Path to write the introspection result to. Supports .json output only.",
      required: true,
      default: "schema.json",
    },
  ];

  async run() {
    this.printDeprecationWarning();

    await this.runTasks(({ args, project, flags, config }) => [
      {
        title: `Saving schema to ${args.output}`,
        task: async () => {
          // XXX Because of how we use schema providers, this command will never download a schema from
          // Apollo. We could change that by refactoring the usage of schema providers, but
          // we currently recommend using client:download-schema instead.
          try {
            const graphVariant: string = config.variant;

            const schema = await project.resolveSchema({ tag: graphVariant });
            await mkdirp(getDirName(args.output));
            fs.writeFileSync(
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
                  "If you're trying to download a schema from the Apollo registry, use the `client:download-schema` command instead."
                )
              );
            }
            throw e;
          }
        },
      },
    ]);
  }
}
