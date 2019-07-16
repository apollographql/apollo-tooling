import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema, printSchema, GraphQLSchema } from "graphql";
import chalk from "chalk";
import { gitInfo } from "../../git";
import { ProjectCommand } from "../../Command";
import {
  validateHistoricParams,
  pluralize,
  CompactRenderer
} from "../../utils";
import {
  CheckSchema_service_checkSchema,
  CheckSchema_service_checkSchema_diffToPrevious_changes as Change,
  ChangeSeverity,
  CheckSchemaVariables,
  IntrospectionSchemaInput,
  IntrospectionTypeInput
} from "apollo-language-server/lib/graphqlTypes";
import {
  ApolloConfig,
  GraphQLServiceProject,
  isServiceProject
} from "apollo-language-server";
import moment from "moment";
import sortBy from "lodash.sortby";
import cli from "cli-ux";
import { isNotNullOrUndefined } from "apollo-env";

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

const reshapeGraphQLErrorToChange = (
  severity: ChangeSeverity,
  message: string
): Change => {
  return {
    severity,
    code: `FEDERATION_VALIDATION_${severity}`,
    description: message,
    __typename: "Change"
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
  checkSchemaResult: CheckSchema_service_checkSchema;
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

  if (!validationConfig) {
    throw new Error(
      "checkSchemaResult.diffToPrevious.validationConfig missing"
    );
  }

  // This will always return a negative number. Use Math.abs to make it positive.
  const hours = Math.abs(
    moment()
      .add(validationConfig.from, "second")
      .diff(moment().add(validationConfig.to, "second"), "hours")
  );

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
🔢 Compared **${pluralize(
    diffToPrevious.changes.length,
    "schema change"
  )}** against **${pluralize(
    diffToPrevious.numberOfCheckedOperations,
    "operation"
  )}** seen over the **last ${formatTimePeriod(hours)}**.
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

    table(
      [
        ...breakingChanges.map(formatChange),
        // Add an empty line between, but only if there are both breaking changes and non-breaking changes.
        nonBreakingChanges.length && breakingChanges.length ? {} : null,
        ...nonBreakingChanges.map(formatChange)
      ].filter(Boolean),
      {
        columns: [
          { key: "severity", label: "Change" },
          { key: "code", label: "Code" },
          { key: "description", label: "Description" }
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
  }

  if (targetUrl) {
    result += `\n\nView full details at: ${targetUrl}${
      graphCompositionID ? `?graphCompositionId=${graphCompositionID}` : ``
    }`;
  }

  return result;
}

export default class ServiceCheck extends ProjectCommand {
  static aliases = ["schema:check"];
  static description =
    "Check a service against known operation workloads to find breaking changes";
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to check this service against"
    }),
    validationPeriod: flags.string({
      description:
        "The size of the time window with which to validate the schema against. You may provide a number (in seconds), or an ISO8601 format duration for more granularity (see: https://en.wikipedia.org/wiki/ISO_8601#Durations)"
    }),
    queryCountThreshold: flags.integer({
      description:
        "Minimum number of requests within the requested time window for a query to be considered."
    }),
    queryCountThresholdPercentage: flags.integer({
      description:
        "Number of requests within the requested time window for a query to be considered, relative to total request count. Expected values are between 0 and 0.05 (minimum 5% of total request volume)"
    }),
    json: flags.boolean({
      description:
        "Output result in json, which can then be parsed by CLI tools such as jq.",
      exclusive: ["markdown", "compactOutput"]
    }),
    localSchemaFile: flags.string({
      description:
        "Path to your local GraphQL schema file (introspection result or SDL)"
    }),
    markdown: flags.boolean({
      description: "Output result in markdown.",
      exclusive: ["json", "compactOutput"]
    }),
    serviceName: flags.string({
      description:
        "Provides the name of the implementing service for a federated graph. This flag will indicate that the schema is a partial schema from a federated service",
      dependsOn: ["endpoint"]
    }),
    compactOutput: flags.boolean({
      description:
        "Only output final results of tasks, do not print intermediate steps.",
      exclusive: ["json", "markdown"]
    })
  };

  async run() {
    // @ts-ignore we're going to populate `taskOutput` later
    const taskOutput: TasksOutput = {};

    // Define this constant so we can throw it and compare against the same value.
    const breakingChangesErrorMessage = "breaking changes found";
    const federatedServiceCompositionUnsuccessfulErrorMessage =
      "Federated service composition was unsuccessful. Please see the reasons below.";

    let schema: GraphQLSchema | undefined;
    try {
      await this.runTasks<TasksOutput>(
        ({ config, flags, project }) => {
          if (!isServiceProject(project)) {
            throw new Error(
              "This project needs to be configured as a service project but is configured as a client project. Please see bit.ly/2ByILPj for help regarding configuration."
            );
          }

          /**
           * Name of the graph being checked. `engine` is an example of a graph.
           *
           * A graph can be either a monolithic schema or the result of composition a federated schema.
           */
          const graphName = config.name;
          const tag = flags.tag || config.tag || "current";

          /**
           * Name of the implementing service being checked.
           *
           * This is optional because this check can be run on a graph or on an implementing service.
           */
          const serviceName: string | undefined = flags.serviceName;

          if (!graphName) {
            throw new Error("No service found to link to Engine");
          }

          // Add some fields to output that are required for producing
          // markdown and json output
          taskOutput.shouldOutputJson = !!flags.json;
          taskOutput.shouldOutputMarkdown = !!flags.markdown;
          taskOutput.serviceName = flags.serviceName;
          taskOutput.config = config;

          return [
            {
              enabled: () => !!serviceName,
              title: `Validate graph composition for service ${chalk.blue(
                serviceName || ""
              )} on graph ${chalk.blue(graphName)}`,
              task: async (ctx: TasksOutput, task) => {
                if (!serviceName) {
                  throw new Error(
                    "This task should not be run without a `serviceName`. Check the `enabled` function."
                  );
                }
                task.output = "Fetching local service's partial schema";

                const info = await project.resolveFederationInfo();
                if (!info.sdl) {
                  throw new Error("No SDL found for federated service");
                }

                task.output = `Attempting to compose graph with ${chalk.blue(
                  serviceName
                )} service's partial schema`;

                const {
                  errors,
                  compositionValidationDetails,
                  graphCompositionID
                } = await project.engine.checkPartialSchema({
                  id: graphName,
                  graphVariant: tag,
                  implementingServiceName: serviceName,
                  partialSchema: {
                    sdl: info.sdl
                  }
                });

                if (
                  compositionValidationDetails &&
                  compositionValidationDetails.schemaHash
                ) {
                  ctx.federationSchemaHash =
                    compositionValidationDetails.schemaHash;
                }

                if (graphCompositionID) {
                  ctx.graphCompositionID = graphCompositionID;
                }

                task.title = `Found ${pluralize(
                  errors.length,
                  "graph composition error"
                )} for service ${chalk.blue(serviceName)} on graph ${chalk.blue(
                  graphName
                )}`;

                if (errors.length > 0) {
                  const decodedErrors = errors
                    .filter(isNotNullOrUndefined)
                    .map(error => {
                      const match = error.message.match(
                        /^\[([^\[]+)\]\s+(\S+)\ ->\ (.+)/
                      );

                      if (!match) {
                        // If we can't match the errors, that means they're in a format we don't recognize.
                        // Report the entire string as the user will see the raw message.
                        return { message: error.message };
                      }

                      // Regular expression matches return `[entireStringMatched, ...eachGroup]`; we don't
                      // care about the entire string match, only the groups, so ignore the first value in the
                      // tuple.
                      const [, service, field, message] = match;
                      return { service, field, message };
                    });

                  taskOutput.compositionErrors = decodedErrors;
                  taskOutput.graphCompositionID = graphCompositionID;

                  this.error(
                    federatedServiceCompositionUnsuccessfulErrorMessage
                  );
                }
              }
            },
            {
              title: `Validating ${
                serviceName ? "composed " : ""
              }schema against tag ${chalk.blue(tag)} on graph ${chalk.blue(
                graphName
              )}`,
              task: async (ctx: TasksOutput, task) => {
                let schemaCheckSchemaVariables:
                  | { schemaHash: string }
                  | { schema: IntrospectionSchemaInput }
                  | undefined;

                // If we're `federated`, then run composition validation. When we're using composition
                // validation we'll receive a schema has that represents the composed schema.
                if (ctx.federationSchemaHash) {
                  schemaCheckSchemaVariables = {
                    schemaHash: ctx.federationSchemaHash
                  };
                } else {
                  // This is _not_ a `federated` schema. Resolve the schema given `config.tag`.
                  task.output = "Resolving schema";
                  schema = await project.resolveSchema({ tag: config.tag });
                  if (!schema) {
                    throw new Error("Failed to resolve schema");
                  }

                  schemaCheckSchemaVariables = {
                    schema: introspectionFromSchema(schema)
                      .__schema as IntrospectionSchemaInput
                  };
                }

                await gitInfo(this.log);

                const historicParameters = validateHistoricParams({
                  validationPeriod: flags.validationPeriod,
                  queryCountThreshold: flags.queryCountThreshold,
                  queryCountThresholdPercentage:
                    flags.queryCountThresholdPercentage
                });

                task.output = "Validating schema";

                const variables: CheckSchemaVariables = {
                  id: graphName,
                  tag: flags.tag,
                  gitContext: await gitInfo(this.log),
                  frontend: flags.frontend || config.engine.frontend,
                  ...(historicParameters && { historicParameters }),
                  ...schemaCheckSchemaVariables
                };

                const { schema: _, ...restVariables } = variables;
                this.debug("Variables sent to Engine:");
                this.debug(restVariables);
                if (schema) {
                  this.debug("SDL of introspection sent to Engine:");
                  this.debug(printSchema(schema));
                } else {
                  this.debug("Schema hash generated:");
                  this.debug(schemaCheckSchemaVariables);
                }

                const checkSchemaResult = await project.engine.checkSchema(
                  variables
                );
                // Attach to ctx as this will be used in later steps.
                ctx.checkSchemaResult = checkSchemaResult;
                // Save the output because we're going to use it even if we throw. `runTasks` won't return
                // anything if we throw.
                taskOutput.checkSchemaResult = checkSchemaResult;

                task.title = task.title.replace("Validating", "Validated");
              }
            },
            {
              title: "Comparing schema changes",
              task: async (ctx: TasksOutput, task) => {
                const schemaChanges =
                  ctx.checkSchemaResult.diffToPrevious.changes;

                const numberOfCheckedOperations =
                  ctx.checkSchemaResult.diffToPrevious
                    .numberOfCheckedOperations || 0;

                const validationConfig =
                  ctx.checkSchemaResult.diffToPrevious.validationConfig;

                const hours = validationConfig
                  ? Math.abs(
                      moment()
                        .add(validationConfig.from, "second")
                        .diff(
                          moment().add(validationConfig.to, "second"),
                          "hours"
                        )
                    )
                  : null;

                task.title = `Compared ${pluralize(
                  chalk.blue(schemaChanges.length.toString()),
                  "schema change"
                )} against ${pluralize(
                  chalk.blue(numberOfCheckedOperations.toString()),
                  "operation"
                )}${
                  hours
                    ? ` over the last ${chalk.blue(formatTimePeriod(hours))}`
                    : ""
                }`;
              }
            },
            {
              title: "Reporting result",
              task: async (ctx: TasksOutput, task) => {
                const breakingSchemaChangeCount = ctx.checkSchemaResult.diffToPrevious.changes.filter(
                  change => change.severity === ChangeSeverity.FAILURE
                ).length;
                const nonBreakingSchemaChangeCount =
                  ctx.checkSchemaResult.diffToPrevious.changes.length -
                  breakingSchemaChangeCount;

                task.title = `Found ${pluralize(
                  chalk.blue(breakingSchemaChangeCount.toString()),
                  "breaking change"
                )} and ${pluralize(
                  chalk.blue(nonBreakingSchemaChangeCount.toString()),
                  "compatible change"
                )}`;

                if (breakingSchemaChangeCount) {
                  // Throw an error here to produce a red X in the list of steps being taken. We're going to
                  // `catch` this error below and proceed with the reporting.
                  throw new Error(breakingChangesErrorMessage);
                }
              }
            }
          ];
        },
        context => ({
          // It would be better here to use a custom renderer that will output the `Listr` output to stderr and
          // the `this.log` output to `stdout`.
          //
          // @see https://github.com/SamVerschueren/listr#renderer
          renderer: context.flags.compactOutput
            ? <any>CompactRenderer
            : context.flags.markdown || context.flags.json
            ? "silent"
            : "default"
        })
      );
    } catch (error) {
      if (error.message.includes("/upgrade")) {
        this.exit(1);

        return;
      }

      if (
        error.message !== breakingChangesErrorMessage &&
        error.message !== federatedServiceCompositionUnsuccessfulErrorMessage
      ) {
        throw error;
      }
    }

    const {
      checkSchemaResult,
      config,
      shouldOutputJson,
      shouldOutputMarkdown,
      serviceName,
      compositionErrors,
      graphCompositionID
    } = taskOutput;

    if (shouldOutputJson) {
      if (compositionErrors) {
        return this.log(JSON.stringify({ errors: compositionErrors }, null, 2));
      }

      return this.log(
        JSON.stringify(
          {
            targetUrl:
              checkSchemaResult.targetUrl +
              (graphCompositionID
                ? `?graphCompositionId=${graphCompositionID}`
                : ``),
            changes: checkSchemaResult.diffToPrevious.changes,
            validationConfig: checkSchemaResult.diffToPrevious.validationConfig
          },
          null,
          2
        )
      );
    } else if (shouldOutputMarkdown) {
      // This _should_ always be here; but TypeScript tells us that's optional. If we check it here, then
      // passing `config` to any other function will signify that `config.service` might now be null or
      // undefined. Save it as a const to tell TypeScript `service` can't be changed.

      const { service } = config;
      if (!service) {
        throw new Error(
          "Service mising from config. This should have been validated elsewhere"
        );
      }

      const graphName = config.service && config.service.name;

      if (!graphName) {
        throw new Error(
          "The graph name should have been defined in the Apollo config and validated when the config was loaded. Please file an issue if you're seeing this error."
        );
      }

      if (compositionErrors) {
        if (!serviceName) {
          throw new Error(
            "Composition errors should only occur when `serviceName` is present. Please file an issue if you're seeing this error."
          );
        }

        return this.log(
          formatCompositionErrorsMarkdown({
            compositionErrors,
            graphName,
            serviceName,
            tag: config.tag
          })
        );
      }

      return this.log(
        formatMarkdown({
          checkSchemaResult,
          graphName,
          serviceName,
          tag: config.tag,
          graphCompositionID
        })
      );
    }

    if (compositionErrors) {
      // Add a cosmetic line break
      console.log("");

      cli.table(compositionErrors, {
        columns: [
          { key: "service", label: "Service" },
          { key: "field", label: "Field" },
          { key: "message", label: "Message" }
        ]
      });

      // Return a non-zero error code
      this.exit(1);
    } else {
      this.log(formatHumanReadable({ checkSchemaResult, graphCompositionID }));

      // exit with failing status if we have failures
      if (
        checkSchemaResult.diffToPrevious.changes.find(
          ({ severity }) => severity === ChangeSeverity.FAILURE
        )
      ) {
        this.exit(1);
      }
    }
  }
}
