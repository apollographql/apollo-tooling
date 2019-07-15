import { ClientCommand } from "../../Command";
import { table } from "heroku-cli-util";
import { relative } from "path";
import URI from "vscode-uri";
import { getOperationManifestFromProject } from "../../utils/getOperationManifestFromProject";
import {
  operationHash,
  defaultOperationRegistrySignature
} from "apollo-graphql";
import { pluralize } from "../../utils";
import chalk from "chalk";
import {
  GraphQLClientProject,
  ApolloConfig,
  graphqlTypes
} from "apollo-language-server";

export default class ClientPush extends ClientCommand {
  static description =
    "Register operations with Apollo, adding them to the safelist";
  static flags = {
    ...ClientCommand.flags
  };

  async run() {
    const invalidOperationsErrorMessage = "encountered invalid operations";
    let result = "";
    try {
      await this.runTasks(({ flags, project, config }) => {
        const clientBundleInfo = `${chalk.blue(
          (config.client && config.client.name) || flags
        )}${chalk.blue(
          (config.client &&
            config.client.version &&
            `@${config.client.version}`) ||
            ""
        )}`;

        return [
          {
            title: `Extracting operation from client, ${clientBundleInfo}`,
            task: async (ctx, task) => {
              const operationManifest = getOperationManifestFromProject(
                this.project
              );
              ctx.operationManifest = operationManifest;
              task.title = `Extracted ${pluralize(
                operationManifest.length,
                "operation"
              )} from client, ${clientBundleInfo}`;
            }
          },
          {
            title: `Checked operations against ${chalk.blue(
              config.name || ""
            )}@${chalk.blue(config.tag)}`,
            task: async () => {}
          },
          {
            title: "Pushing operations to operation registry",
            task: async (_, task) => {
              if (!config.name) {
                throw new Error(
                  "No service found to link to Engine. Engine is required for this command."
                );
              }

              const operationManifest = getOperationManifestFromProject(
                this.project
              );

              const signatureToOperation = generateSignatureToOperationMap(
                this.project,
                config
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
                operations: operationManifest,
                manifestVersion: 2,
                graphVariant:
                  flags.variant || flags.tag || config.tag || "current"
              };
              const { operations: _op, ...restVariables } = variables;
              this.debug("Variables sent to Apollo");
              this.debug(restVariables);
              this.debug("Operations sent to Apollo");
              this.debug(operationManifest);

              let response: graphqlTypes.RegisterOperations_service_registerOperationsWithResponse;
              const {
                invalidOperations,
                newOperations,
                registrationSuccess
              } = (response = await project.engine.registerOperations(
                variables
              ));

              this.debug("Results received from Apollo");
              this.debug(response);

              if (!registrationSuccess) {
                if (invalidOperations) {
                  invalidOperations.forEach(operation => {
                    const { operationName, file } = signatureToOperation[
                      operation.signature
                    ];
                    result += `\n${chalk.red(
                      "FAIL"
                    )}\t${operationName} ${chalk.blue(file)}`;
                    operation.errors &&
                      operation.errors.forEach(
                        ({ message }) => (result += `\n\t${message}`)
                      );
                  });
                  task.title = `Failed to push operations, due to ${pluralize(
                    invalidOperations.length,
                    "invalid operation"
                  )}`;
                  throw new Error(invalidOperationsErrorMessage);
                } else {
                  task.title = `Failed to register operations`;
                  throw new Error(
                    [
                      "Registration failed and did not receive invalid operations.",
                      "This should not occur, so please open a GitHub issue on:",
                      "https://github.com/apollographql/apollo-tooling/"
                    ].join("\n")
                  );
                }
              } else {
                if (newOperations && newOperations.length) {
                  task.title = `Successfully pushed ${pluralize(
                    newOperations.length,
                    "operation"
                  )} to the operation registry`;

                  table(
                    newOperations.map(operation => {
                      const { operationName, file } = signatureToOperation[
                        operation.signature
                      ];

                      return {
                        added: chalk.green("ADDED"),
                        name: operationName,
                        file: chalk.blue(file)
                      };
                    }),
                    {
                      columns: [
                        { key: "added", label: "Added" },
                        { key: "name", label: "Operation Name" },
                        { key: "file", label: "File Path" }
                      ],
                      // Override `printHeader` so we don't print a header
                      printHeader: () => {},
                      // The default `printLine` will output to the console; we want to capture the output so we can test
                      // it.
                      printLine: line => {
                        result += `\n${line}`;
                      }
                    }
                  );
                } else {
                  task.title = `All operations were already found in the operation registry`;
                }
              }
            }
          }
        ];
      });
    } catch (e) {
      // Print results when we have an expected error message
      if (e.message === invalidOperationsErrorMessage) {
        this.log(result);
        this.exit(1);
      }
      throw e;
    }
    this.log(result);
  }
}

function generateSignatureToOperationMap(
  project: GraphQLClientProject,
  config: ApolloConfig
) {
  return Object.fromEntries(
    Object.entries(project.mergedOperationsAndFragmentsForService).map(
      ([operationName, document]) => {
        const operationDefinition = document.definitions.find(
          ({ kind }) => kind === "OperationDefinition"
        );
        const relativePath =
          operationDefinition &&
          operationDefinition.loc &&
          relative(
            config.configURI ? config.configURI.fsPath : "",
            URI.parse(operationDefinition.loc.source.name).fsPath
          );
        const line =
          operationDefinition &&
          operationDefinition.loc &&
          operationDefinition.loc.source.locationOffset.line;
        return [
          operationHash(
            defaultOperationRegistrySignature(document, operationName)
          ),
          {
            operationName,
            document,
            file: line ? `${relativePath}:${line}` : relativePath || ""
          }
        ];
      }
    )
  );
}
