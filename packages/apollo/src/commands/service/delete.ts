import cli from "cli-ux";
import { flags } from "@oclif/command";

import { ProjectCommand } from "../../Command";

export default class ServiceDelete extends ProjectCommand {
  static description =
    "Delete a federated service from Apollo Graph Manager and recompose remaining services";
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The variant of the service to delete"
    }),
    federated: flags.boolean({
      char: "f",
      default: false,
      hidden: true,
      description:
        "[Deprecated: use --serviceName to indicate federation] Indicates that the schema is a partial schema from a federated service"
    }),
    serviceName: flags.string({
      required: true,
      description:
        "Provides the name of the implementing service for a federated graph"
    }),
    yes: flags.boolean({
      char: "y",
      required: false,
      description: "Bypass confirmation when deleting a service"
    })
  };

  async run() {
    let result;
    const { flags } = this.parse(ServiceDelete);

    // if the yes flag is set we don't need a confirmation, the yes flag is needed for CI or programmatic use.
    const confirmed =
      flags.yes ||
      (await cli.confirm(
        "Are you sure you want to delete this service? THIS IS NOT REVERSIBLE! (y/N)"
      ));

    if (!confirmed) {
      this.log("You have chosen to not delete this service. Exiting...");
      this.exit(0);
    }

    await this.runTasks(({ flags, project, config }) => [
      {
        title: "Removing service from Apollo Graph Manager",
        task: async () => {
          if (!config.name) {
            throw new Error("No service found to link to Apollo Graph Manager");
          }

          if (flags.federated) {
            this.log(
              "The --federated flag is no longer required when running federated commands. Use of the flag will not be supported in future versions of the CLI."
            );
          }

          const graphVariant = flags.tag || config.tag || "current";

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
        `The ${result.serviceName} service with ${result.graphVariant} tag was removed from ${result.graphName}. Remaining services were composed.`
      );
      this.log("\n");
    }
  }
}
