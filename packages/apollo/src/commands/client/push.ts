import { createHash } from "crypto";
import {
  printWithReducedWhitespace,
  sortAST,
  defaultSignature as engineDefaultSignature
} from "apollo-engine-reporting";

import {
  visit,
  DocumentNode,
  IntValueNode,
  FloatValueNode,
  StringValueNode
} from "graphql";

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

// In the same spirit as the similarly named `hideLiterals` function from the
// `apollo-engine-reporting/src/signature.ts` module, we'll do an AST visit
// to redact literals.  Developers are strongly encouraged to use the
// `variables` aspect of the which would avoid these being explicitly
// present in the operation manifest at all.  The primary area of concern here
// is to avoid sending in-lined literals which might contain sensitive
// information (e.g. API keys, etc.).
export function hideCertainLiterals(ast: DocumentNode): DocumentNode {
  return visit(ast, {
    IntValue(node: IntValueNode): IntValueNode {
      return { ...node, value: "0" };
    },
    FloatValue(node: FloatValueNode): FloatValueNode {
      return { ...node, value: "0" };
    },
    StringValue(node: StringValueNode): StringValueNode {
      return { ...node, value: "", block: false };
    }
  });
}

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
          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }
          const operations = Object.values(
            this.project.mergedOperationsAndFragmentsForService
          ).map(operationAST => {
            // While this could include dropping unused definitions, they are
            // kept because the registered operations should mirror those in the
            // client bundle minus any PII which lives within string literals.
            const printed = printWithReducedWhitespace(
              sortAST(hideCertainLiterals(operationAST))
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
