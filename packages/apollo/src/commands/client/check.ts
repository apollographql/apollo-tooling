import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { print } from "graphql";

import { gitInfo } from "../../git";
import { ClientCommand } from "../../Command";
import URI from "vscode-uri";
import { relative } from "path";
import {
  ValidateOperations_service_validateOperations_validationResults as ValidationResult,
  ValidationErrorType
} from "apollo-language-server/src/graphqlTypes";
import chalk from "chalk";

interface Operation {
  body: string;
  name: string;
  relativePath: string;
  locationOffset: LocationOffset;
}
interface LocationOffset {
  column: number;
  line: number;
}

export default class ClientCheck extends ClientCommand {
  static description = "Check a client project against a pushed service";
  static flags = {
    ...ClientCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to check this client against"
    })
  };

  async run() {
    const { validationResults, operations } = await this.runTasks<{
      operations: Operation[];
      validationResults: ValidationResult[];
    }>(({ project, config }) => [
      {
        title: "Checking client compatibility with service",
        task: async ctx => {
          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }
          ctx.gitContext = await gitInfo();

          ctx.operations = Object.entries(
            this.project.mergedOperationsAndFragmentsForService
          ).map(([name, doc]) => ({
            body: print(doc),
            name,
            relativePath: relative(
              config.configURI ? config.configURI.fsPath : "",
              URI.parse(doc.definitions[0].loc!.source.name).fsPath
            ),
            locationOffset: doc.definitions[0].loc!.source.locationOffset
          }));

          ctx.validationResults = await project.engine.validateOperations({
            id: config.name,
            tag: config.tag,
            operations: ctx.operations.map(({ body, name }) => ({
              body,
              name
            })),
            gitContext: ctx.gitContext
          });
        }
      }
    ]);

    // Group the validation results by operation name
    const messagesByOperationName = this.getMessagesByOperationName(
      validationResults,
      operations
    );

    // For each operation, log its loc and iterate over all associated validationResults
    this.log();
    Object.values(messagesByOperationName).forEach(
      this.logMessagesForOperation
    );

    if (validationResults.length === 0) {
      return this.log(
        chalk.green("\nAll operations are valid against service\n")
      );
    }

    this.printStats(validationResults, operations);

    // exit with failing status if there are any failures or invalid documents
    const hasFailures = validationResults.some(
      ({ type }: ValidationResult) =>
        type === ValidationErrorType.FAILURE ||
        type === ValidationErrorType.INVALID
    );
    if (hasFailures) {
      this.exit();
    }

    return;
  }

  getMessagesByOperationName(
    validationResults: ValidationResult[],
    operations: Operation[]
  ) {
    return validationResults.reduce<{
      [operationName: string]: {
        operation: Operation;
        validationResults: ValidationResult[];
      };
    }>((byOperation, validationResult) => {
      // Match a validation result to a known operation (by name)
      const matchingOperation = operations.find(
        ({ name }) => name === validationResult.operation.name
      );

      // If we find a match, add the validationResult to its respective array
      if (matchingOperation) {
        byOperation[matchingOperation.name] = {
          operation: matchingOperation,
          validationResults: byOperation[matchingOperation.name]
            ? [
                ...byOperation[matchingOperation.name].validationResults,
                validationResult
              ]
            : [validationResult]
        };
      }
      return byOperation;
    }, {});
  }

  logMessagesForOperation = ({
    validationResults,
    operation
  }: {
    validationResults: ValidationResult[];
    operation: Operation;
  }) => {
    const { name, locationOffset, relativePath } = operation;
    this.log(
      `${name}: ${chalk.blue(`${relativePath}:${locationOffset.line}`)}\n`
    );

    const byErrorType = validationResults.reduce(
      (byError, validation) => {
        validation;
        byError[validation.type].push(validation);
        return byError;
      },
      {
        [ValidationErrorType.INVALID]: [],
        [ValidationErrorType.FAILURE]: [],
        [ValidationErrorType.WARNING]: []
      } as { [key in ValidationErrorType]: ValidationResult[] }
    );

    Object.values(byErrorType).map(validations => {
      if (validations.length > 0) {
        validations.forEach(validation => {
          this.log(this.formatValidation(validation));
        });
        this.log();
      }
    });
  };

  formatValidation({ type, description }: ValidationResult) {
    let color = (x: string) => x;
    switch (type) {
      case ValidationErrorType.FAILURE:
        color = chalk.red;
        break;
      case ValidationErrorType.INVALID:
        color = chalk.gray;
        break;
      case ValidationErrorType.WARNING:
        color = chalk.yellow;
        break;
    }
    return `    ${color(type)}    ${description}`;
  }

  printStats = (
    validationResults: ValidationResult[],
    operations: Operation[]
  ) => {
    const counts = validationResults.reduce(
      (counts, { type }) => {
        switch (type) {
          case ValidationErrorType.INVALID:
            counts.invalid++;
            break;
          case ValidationErrorType.FAILURE:
            counts.failure++;
            break;
          case ValidationErrorType.WARNING:
            counts.warning++;
        }
        return counts;
      },
      {
        invalid: 0,
        failure: 0,
        warning: 0
      }
    );

    this.log(`${operations.length} total operations validated`);

    if (counts.invalid > 0) {
      this.log(
        chalk.cyan(
          `${counts.invalid} invalid document${counts.invalid > 1 ? "s" : ""}`
        )
      );
    }
    if (counts.failure > 0) {
      this.log(
        chalk.red(`${counts.failure} failure${counts.failure > 1 ? "s" : ""}`)
      );
    }
    if (counts.warning > 0) {
      this.log(
        chalk.yellow(
          `${counts.warning} warning${counts.warning > 1 ? "s" : ""}`
        )
      );
    }
  };
}
