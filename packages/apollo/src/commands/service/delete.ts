import { flags } from "@oclif/command";

import { ProjectCommand } from "../../Command";

export default class ServiceDelete extends ProjectCommand {
  static description =
    "Delete an implementing service from a Graph in the Apollo Platform and recompose remaining implementing services";
  static flags = {
    ...ProjectCommand.flags,
    ...ProjectCommand.variantFlags,
    federated: flags.boolean({
      char: "f",
      default: false,
      hidden: true,
      description:
        "[Deprecated: use --serviceName to indicate federation] Indicates that the schema is a partial schema from an implementing service"
    }),
    serviceName: flags.string({
      required: true,
      description:
        "Provides the name of the implementing service for a federated graph"
    })
  };

  async run() {
    let result;
    await this.runTasks(({ flags, project, config }) => [
      {
        title: `Removing implementing service ${flags.serviceName} from graph ${config.name}`,
        task: async () => {
          if (!config.name) {
            throw new Error("No graph name found in Apollo config");
          }

          if (flags.federated) {
            this.log(
              "The --federated flag is no longer required when running federated commands. Use of the flag will not be supported in future versions of the CLI."
            );
          }

          const graphVariant = config.variant;

          const {
            errors,
            updatedGateway
          } = await project.engine.removeServiceAndCompose({
            id: config.name,
            graphVariant,
            name: flags.serviceName
          });

          result = {
            serviceName: flags.serviceName,
            graphVariant,
            graphName: config.name,
            errors,
            updatedGateway
          };

          return;
        }
      }
    ]);

    this.log("\n");

    if (result.errors && result.errors.length) {
      this.error(result.errors.map(error => error.message).join("\n"));
    }

    if (result.updatedGateway) {
      this.log(
        `The ${result.serviceName} implementing service with ${result.graphVariant} variant was removed from graph ${result.graphName}. Remaining implementing services were composed.`
      );
      this.log("\n");
    }
  }
}
