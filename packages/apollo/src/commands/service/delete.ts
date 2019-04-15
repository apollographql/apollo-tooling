import { flags } from "@oclif/command";

import { ProjectCommand } from "../../Command";

export default class ServiceDelete extends ProjectCommand {
  static description =
    "Delete a federated service from Engine and recompose remaining services";
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The variant of the service to delete",
      default: "current"
    }),
    federated: flags.boolean({
      char: "f",
      default: false,
      description:
        "Indicates that the schema is a partial schema from a federated service"
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
        title: "Removing service from Engine",
        task: async () => {
          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }

          if (!flags.federated) {
            this.error(
              "Deleting a service is only supported for federated services. Use the --federated flag if this is a federated service."
            );
          }

          const {
            // compositionConfig,
            errors,
            warnings,
            updatedGateway
          } = await project.engine.removeServiceAndCompose({
            id: config.name,
            graphVariant: flags.tag || config.tag,
            name: flags.serviceName // XXX should this also use queried service info?
          });

          result = {
            serviceName: flags.serviceName,
            graphVariant: config.tag,
            graphName: config.name,
            warnings,
            errors,
            updatedGateway
          };

          return;
        }
      }
    ]);

    this.log("\n");

    if (result.errors && result.errors.length) {
      this.error(result.errors.join("\n"));
    }

    if (result.warnings && result.warnings.length) {
      this.warn(result.warnings.join("\n"));
    }

    if (result.updatedGateway) {
      this.log(
        `The ${result.serviceName} service with ${
          result.graphVariant
        } tag was removed from ${
          result.graphName
        }. Remaining services were composed.`
      );
      this.log("\n");
    }
  }
}
