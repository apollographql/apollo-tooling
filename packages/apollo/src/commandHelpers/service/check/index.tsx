import { flags } from "@oclif/command";
import { table } from "table";
import { introspectionFromSchema, printSchema, GraphQLSchema } from "graphql";
import chalk from "chalk";
import envCi from "env-ci";
import { gitInfo } from "../../../git";
import { ProjectCommand } from "../../../Command";
import {
  CompactRenderer,
  pluralize,
  validateHistoricParams
} from "../../../utils";
import {
  ChangeSeverity,
  CheckPartialSchema_service_checkPartialSchema_checkSchemaResult,
  CheckSchema_service_checkSchema,
  CheckSchema_service_checkSchema_diffToPrevious_changes as Change,
  CheckSchemaVariables,
  IntrospectionSchemaInput
} from "apollo-language-server/lib/graphqlTypes";
import {
  ApolloConfig,
  isServiceProject,
  GraphQLProject
} from "apollo-language-server";
import moment from "moment";
import sortBy from "lodash.sortby";
import { isNotNullOrUndefined } from "apollo-env";
import React from "react";
import { render, Color } from "ink";
import { Progress } from "../../Progress";
import { validateComposition } from "./validateComposition";
import { validateSchema } from "./validateSchema";
import { Step } from "../../Step";
import { Status } from "../../Status";

/**
 * Service check
 */
export async function check({
  flags,
  project,
  config
}: {
  flags: any;
  project: GraphQLProject;
  config: ApolloConfig;
}) {
  if (!config.name) {
    throw new Error("Project must have a name");
  }

  /**
   * Name of the graph being checked. `engine` is an example of a graph.
   *
   * A graph can be either a monolithic schema or the result of composition a federated schema.
   */
  const graphID = config.name;
  if (!graphID) {
    throw new Error("No service found to link to Apollo Graph Manager");
  }

  const graphVariant: string = config.tag;

  /**
   * Name of the implementing service being checked.
   *
   * This is optional because this check can be run on a graph or on an implementing service.
   */
  const serviceName: string | undefined = flags.serviceName;

  const validateCompositionStep: Step = {
    name: (
      <>
        Validate graph composition for service <Color cyan>{serviceName}</Color>{" "}
        on graph <Color cyan>{graphID}</Color>
      </>
    ),
    status: Status.pending,
    key: "validateComposition"
  };
  const readProjectStep: Step = {
    name: `Reading project from Apollo config`,
    status: Status.complete,
    key: "config"
  };
  const validateStep: Step = {
    name: `Validate ${
      serviceName ? "composed " : ""
    }schema against tag ${chalk.cyan(graphVariant!)} on graph ${chalk.cyan(
      graphID
    )}`,
    status: Status.pending,
    key: "validate"
  };

  /**
   * Define all the steps individually and then a single array that contains all the steps. This will allow us
   * to do two things:
   *
   * 1. Change the params of each step without caring where it exists in the `steps` array
   * 2.
   */
  const steps: ReadonlyArray<Step> = [
    readProjectStep,
    // This will prevent displaying a "validation composition" step in the progress for a non-federated graph.
    // Is this what we want? we might want to skip this step?
    serviceName && validateCompositionStep,
    validateStep
  ].filter<Step>((step): step is Step => !!step);

  // Render a list of all the steps we're _going_ to perform
  const { rerender } = render(<Progress steps={steps} />);

  // TODO: validate composition if `serviceName`

  if (serviceName) {
    // Discussion point: how do we handle a step that has it's own collection of steps?!?

    /**
     * step 1
     * Validation composition (items nested under this element are going to be `Step`s from `validateComposition`)
     *   step 2.a
     *   step 2.b
     */
    validateCompositionStep.status = Status.running;
    rerender(<Progress steps={steps} />);

    // `validateComposition` is going to do some work and it's going to have it's own list of steps that it's
    // going to perform. The `check` function doesn't need to care what those steps are, and the
    // `validateComposition` function doesn't care about how it's being called. How do we decouple the
    // implementations? I figured create an optional callback function that will accept `ReadonlyArray<Steps>`
    // that `validateComposition` can call and the caller can choose to do something with it.
    await validateComposition(
      {
        flags: flags,
        frontend: flags.frontend || config.engine.frontend,
        graphID,
        graphVariant,
        project,
        serviceName
      },
      interimSteps => {
        console.warn(interimSteps);
      }
    );
    validateCompositionStep.status = Status.complete;
  }

  // Update `steps` and re-render
  validateStep.status = Status.running;
  rerender(<Progress steps={steps} />);

  // ## Validate the schema

  try {
    await validateSchema({
      config,
      frontend: flags.frontend || config.engine.frontend,
      graphID,
      project,
      graphVariant,
      queryCountThreshold: flags.queryCountThreshold,
      queryCountThresholdPercentage: flags.queryCountThresholdPercentage,
      validationPeriod: flags.validationPeriod
    });
  } catch (error) {
    validateStep.status = Status.error;
    validateStep.error = error;
    rerender(<Progress steps={steps} />);
    process.exit(1);
  }

  validateStep.status = Status.complete;
  rerender(<Progress steps={steps} />);

  // TODO: Write output!
}

const formatChange = (change: Change) => {
  let color = (x: string): string => x;
  if (change.severity === ChangeSeverity.FAILURE) {
    color = chalk.red;
  }

  if (change.severity === ChangeSeverity.WARNING) {
    color = chalk.yellow;
  }

  const changeDictionary: Record<ChangeSeverity, string> = {
    [ChangeSeverity.FAILURE]: "FAIL",
    [ChangeSeverity.WARNING]: "WARN",
    [ChangeSeverity.NOTICE]: "PASS"
  };

  return {
    severity: color(changeDictionary[change.severity]),
    code: color(change.code),
    description: color(change.description)
  };
};

export function formatTimePeriod(hours: number): string {
  if (hours <= 24) {
    return pluralize(hours, "hour");
  }

  return pluralize(Math.floor(hours / 24), "day");
}

type CompositionErrors = Array<{
  service?: string;
  field?: string;
  message: string;
}>;

interface TasksOutput {
  config: ApolloConfig;
  checkSchemaResult:
    | CheckSchema_service_checkSchema
    | CheckPartialSchema_service_checkPartialSchema_checkSchemaResult;
  shouldOutputJson: boolean;
  shouldOutputMarkdown: boolean;
  federationSchemaHash?: string;
  serviceName: string | undefined;
  compositionErrors?: CompositionErrors;
  graphCompositionID?: string;
}

export function formatMarkdown({
  checkSchemaResult,
  graphName,
  serviceName,
  tag,
  graphCompositionID
}: {
  checkSchemaResult: CheckSchema_service_checkSchema;
  graphName: string;
  serviceName?: string | undefined;
  tag: string;
  // this will only exist for federated schema check
  graphCompositionID: string | undefined;
}): string {
  const { diffToPrevious } = checkSchemaResult;

  if (!diffToPrevious) {
    throw new Error("checkSchemaResult.diffToPrevious missing");
  }

  const { validationConfig } = diffToPrevious;

  let validationText = "";
  if (validationConfig) {
    // The validationConfig will always return a negative number. Use Math.abs to make it positive.
    const hours = Math.abs(
      moment()
        .add(validationConfig.from, "second")
        .diff(moment().add(validationConfig.to, "second"), "hours")
    );

    validationText = `🔢 Compared **${pluralize(
      diffToPrevious.changes.length,
      "schema change"
    )}** against **${pluralize(
      diffToPrevious.numberOfCheckedOperations,
      "operation"
    )}** seen over the **last ${formatTimePeriod(hours)}**.`;
  }

  const breakingChanges = diffToPrevious.changes.filter(
    change => change.severity === "FAILURE"
  );

  const affectedQueryCount = diffToPrevious.affectedQueries
    ? diffToPrevious.affectedQueries.length
    : 0;

  return `
### Apollo Service Check
🔄 Validated your local schema against schema tag \`${tag}\` ${
    serviceName ? `for service \`${serviceName}\` ` : ""
  }on graph \`${graphName}\`.
${validationText}
${
  breakingChanges.length > 0
    ? `❌ Found **${pluralize(
        diffToPrevious.changes.filter(change => change.severity === "FAILURE")
          .length,
        "breaking change"
      )}** that would affect **${pluralize(
        affectedQueryCount,
        "operation"
      )}** across **${pluralize(
        diffToPrevious.affectedClients && diffToPrevious.affectedClients.length,
        "client"
      )}**`
    : diffToPrevious.changes.length === 0
    ? `✅ Found **no changes**.`
    : `✅ Found **no breaking changes**.`
}

🔗 [View your service check details](${checkSchemaResult.targetUrl +
    (graphCompositionID ? `?graphCompositionId=${graphCompositionID})` : `)`)}.
`;
}

export function formatCompositionErrorsMarkdown({
  compositionErrors,
  graphName,
  serviceName,
  tag
}: {
  compositionErrors: CompositionErrors;
  graphName: string;
  serviceName: string;
  tag: string;
}): string {
  return `
### Apollo Service Check
🔄 Validated graph composition on schema tag \`${tag}\` for service \`${serviceName}\` on graph \`${graphName}\`.
❌ Found **${compositionErrors.length} composition errors**

| Service   | Field     | Message   |
| --------- | --------- | --------- |
${compositionErrors
  .map(
    ({ service, field, message }) => `| ${service} | ${field} | ${message} |`
  )
  .join("\n")}
`;
}

export function formatHumanReadable({
  checkSchemaResult,
  graphCompositionID
}: {
  checkSchemaResult: CheckSchema_service_checkSchema;
  // this will only exist for federated schema check
  graphCompositionID: string | undefined;
}): string {
  const {
    targetUrl,
    diffToPrevious: { changes }
  } = checkSchemaResult;
  let result = "";

  if (changes.length === 0) {
    result = "\nNo changes present between schemas";
  } else {
    // Create a sorted list of the changes. We'll then filter values from the sorted list, resulting in sorted
    // filtered lists.
    const sortedChanges = sortBy<typeof changes[0]>(changes, [
      change => change.code,
      change => change.description
    ]);

    const breakingChanges = sortedChanges.filter(
      change => change.severity === ChangeSeverity.FAILURE
    );

    sortBy(breakingChanges, change => change.severity);

    const nonBreakingChanges = sortedChanges.filter(
      change => change.severity !== ChangeSeverity.FAILURE
    );

    result += table([
      ["Change", "Code", "Description"],
      ...[
        ...breakingChanges.map(formatChange).map(Object.values),
        // Add an empty line between, but only if there are both breaking changes and non-breaking changes.
        // nonBreakingChanges.length && breakingChanges.length ? {} : null,
        ...nonBreakingChanges.map(formatChange).map(Object.values)
      ].filter(Boolean)
    ]);
  }

  if (targetUrl) {
    result += `\n\nView full details at: ${targetUrl}${
      graphCompositionID ? `?graphCompositionId=${graphCompositionID}` : ``
    }`;
  }

  return result;
}

async function validatePartialSchema(
  updateSteps: (steps: ReadonlyArray<Step>) => void,
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
  }
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
    name: `Composing graph with ${chalk.cyan(
      serviceName
    )} service's partial schema`,
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
