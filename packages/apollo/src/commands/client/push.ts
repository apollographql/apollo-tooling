import { createHash } from "crypto";
import {
  hideLiterals,
  printWithReducedWhitespace,
  sortAST,
  defaultSignature as engineDefaultSignature
} from "apollo-engine-reporting";
import { DocumentNode } from "graphql";

import { ClientCommand } from "../../Command";

const manifestOperationHash = (str: string): string =>
  createHash("sha256")
    .update(str)
    .digest("hex");

const engineSignature = (_TODO_operationAST: DocumentNode): string => {
  // TODO.  We don't currently have access to the operation name since it's
  // currently omitted by the `apollo-codegen-core` package logic.
  return engineDefaultSignature(_TODO_operationAST, "TODO");
};

export default class ServicePush extends ClientCommand {
  static description = "Push a service to Engine";
  static flags = {
    ...ClientCommand.flags
  };

  async run() {
    const {
      clientIdentity,
      operations,
      serviceName
    }: any = await this.runTasks(({ flags, project, config }) => [
      {
        title: "Pushing client information to Engine",
        task: async ctx => {
          const operations = Object.values(
            this.project.mergedOperationsAndFragmentsForService
          ).map(operationAST => {
            // While this could include dropping unused definitions, they are
            // kept because the registered operations should mirror those in the
            // client bundle minus any PII which lives within string literals.
            const printed = printWithReducedWhitespace(
              sortAST(hideLiterals(operationAST))
            );

            return {
              signature: manifestOperationHash(printed),
              document: printed,
              metadata: {
                engineSignature: engineSignature(operationAST)
              }
            };
          });

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
            operations
          };

          await project.engine.registerOperations(variables);

          // store data for logging
          ctx.operations = operations;
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
