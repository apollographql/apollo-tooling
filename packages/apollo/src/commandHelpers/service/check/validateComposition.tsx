import { Step } from "../../Step";
import { GraphQLProject } from "apollo-language-server";
import { Status } from "../../Status";
import React from "react";
import { Color } from "ink";
import { validateHistoricParams } from "../../../utils";

export async function validateComposition(
  {
    flags,
    graphID,
    frontend,
    project,
    serviceName,
    graphVariant
  }: {
    flags: Parameters<typeof validateHistoricParams>[0];
    frontend: string;
    graphID: string;
    graphVariant: string;
    project: GraphQLProject;
    serviceName: string;
  },
  /**
   * Function to update caller with status
   */
  updateSteps: (steps: ReadonlyArray<Step>) => void = () => {}
) {
  if (!serviceName) {
    throw new Error(
      "This task should not be run without a `serviceName`. Check the `enabled` function."
    );
  }

  const fetchPartialSchemaStep: Step = {
    name: "Fetching local service's partial schema",
    key: "fetchPartialSchema",
    status: Status.pending
  };
  const composeStep: Step = {
    name: (
      <>
        Composing graph with <Color cyan>{serviceName}</Color> service's partial
        schema
      </>
    ),
    key: "compose",
    status: Status.pending
  };
  const steps: Step[] = [fetchPartialSchemaStep, composeStep];

  updateSteps(steps);

  const sdl = await project.resolveFederatedServiceSDL();
  if (!sdl) {
    fetchPartialSchemaStep.status = Status.error;
    fetchPartialSchemaStep.error = new Error(
      "No SDL found for federated service"
    );
    updateSteps(steps);
    throw fetchPartialSchemaStep.error;
  }

  fetchPartialSchemaStep.status = Status.complete;
  composeStep.status = Status.running;
  updateSteps(steps);

  // const historicParameters = validateHistoricParams({
  //   validationPeriod: flags.validationPeriod,
  //   queryCountThreshold: flags.queryCountThreshold,
  //   queryCountThresholdPercentage: flags.queryCountThresholdPercentage
  // });

  // const {
  //   compositionValidationResult,
  //   checkSchemaResult
  // } = await project.engine.checkPartialSchema({
  //   id: graphID!,
  //   graphVariant: graphVariant!,
  //   implementingServiceName: serviceName,
  //   partialSchema: {
  //     sdl
  //   },
  //   frontend,
  //   ...(historicParameters && { historicParameters }),
  //   gitContext: await gitInfo(this.log)
  // });

  // // task.title = `Found ${pluralize(
  // //   compositionValidationResult.errors.length,
  // //   "graph composition error"
  // // )} for service ${chalk.cyan(serviceName)} on graph ${chalk.cyan(graphID!)}`;

  // if (compositionValidationResult.errors.length > 0) {
  //   const decodedErrors = compositionValidationResult.errors
  //     .filter(isNotNullOrUndefined)
  //     .map(error => {
  //       const match = error.message.match(/^\[([^\[]+)\]\s+(\S+)\ ->\ (.+)/);

  //       if (!match) {
  //         // If we can't match the errors, that means they're in a format we don't recognize.
  //         // Report the entire string as the user will see the raw message.
  //         return { message: error.message };
  //       }

  //       // Regular expression matches return `[entireStringMatched, ...eachGroup]`; we don't
  //       // care about the entire string match, only the groups, so ignore the first value in the
  //       // tuple.
  //       const [, service, field, message] = match;
  //       return { service, field, message };
  //     });

  //   // taskOutput.compositionErrors = decodedErrors;
  //   // taskOutput.graphCompositionID =
  //   //   compositionValidationResult.graphCompositionID;

  //   // this.error(federatedServiceCompositionUnsuccessfulErrorMessage);
  // } else {
  //   if (!checkSchemaResult) {
  //     throw new Error(
  //       "Violated invariant. Schema should have been validated against operations if" +
  //         "there were no composition errors"
  //     );
  //   }

  //   // this is used for the printing
  //   taskOutput.checkSchemaResult = checkSchemaResult;

  //   // this is used for the next step in the `run` command (comparing schema changes)
  //   ctx.checkSchemaResult = checkSchemaResult;
  // }
}
