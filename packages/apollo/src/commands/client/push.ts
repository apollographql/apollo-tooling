import { ClientCommand } from "../../Command";
import {
  getOperationManifestFromProject,
  ManifestEntry
} from "../../utils/getOperationManifestFromProject";
import { ClientIdentity } from "apollo-language-server";

export default class ServicePush extends ClientCommand {
  static description = "Push a service to Engine";
  static flags = {
    ...ClientCommand.flags
  };

  async run() {
    const { clientIdentity, operations, serviceName } = await this.runTasks<{
      clientIdentity: ClientIdentity;
      operations: ManifestEntry[];
      serviceName: string;
    }>(({ flags, project, config }) => [
      {
        title: "Pushing client information to Engine",
        task: async ctx => {
          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }

          const operationManifest = getOperationManifestFromProject(
            this.project
          );

          const { name, referenceID, version } = config.client!;
          if (!name) {
            throw new Error("Client name is required to push");
          }

          const variables = {
            clientIdentity: {
              name: name,
              identifier: referenceID || name,
              version
            },
            id: config.name,
            operations: operationManifest
          };

          await project.engine.registerOperations(variables);

          // store data for logging
          ctx.operations = operationManifest;
          ctx.serviceName = variables.id;
          ctx.clientIdentity = variables.clientIdentity;
        }
      }
    ]);

    this.log(
      `Successfully pushed ${operations.length} operations from the ${
        clientIdentity.name
      } client to the ${serviceName} service in Engine`
    );
  }
}
