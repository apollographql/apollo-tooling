import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema, printSchema } from "graphql";
import chalk from "chalk";
import { gitInfo } from "../../git";
import { ProjectCommand } from "../../Command";
import { validateHistoricParams } from "../../utils";
import {
  CheckSchema_service_checkSchema,
  CheckSchema_service_checkSchema_diffToPrevious_changes as Change,
  ChangeSeverity,
  CheckSchemaVariables
} from "apollo-language-server/lib/graphqlTypes";
import { ApolloConfig, GraphQLServiceProject } from "apollo-language-server";
import moment from "moment";
import sortBy from "lodash.sortby";
import stripANSI from "strip-ansi";

function pluralize(
  quantity: string | number | null,
  singular: string,
  plural: string = `${singular}s`
) {
  // Strip ansi color from `quantity` if it's a string
  const strippedQuantity =
    typeof quantity === "string" ? parseInt(stripANSI(quantity), 0) : quantity;

  return `${quantity} ${strippedQuantity === 1 ? singular : plural}`;
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

const formatFederationChange = (type: ChangeSeverity, message: string) => {
  let color = (x: string): string => x;
  if (type === ChangeSeverity.FAILURE) {
    color = chalk.red;
  }

  if (type === ChangeSeverity.WARNING) {
    color = chalk.yellow;
  }

  const changeDictionary: Record<ChangeSeverity, string> = {
    [ChangeSeverity.FAILURE]: "FAIL",
    [ChangeSeverity.WARNING]: "WARN",
    [ChangeSeverity.NOTICE]: "PASS"
  };

  return {
    type: color(changeDictionary[type]),
    message: color(message)
  };
};

export function formatTimePeriod(hours: number): string {
  if (hours <= 24) {
    return pluralize(hours, "hour");
  }

  return pluralize(Math.floor(hours / 24), "day");
}

interface TasksOutput {
  config: ApolloConfig;
  checkSchemaResult: CheckSchema_service_checkSchema;
  shouldOutputJson: boolean;
  shouldOutputMarkdown: boolean;
  federation?: {
    errors: ({ message: string } | null)[];
    warnings: ({ message: string } | null)[];
    schemaHash?: string | null;
  };
}

export function formatMarkdown({
  checkSchemaResult,
  serviceName,
  tag
}: {
  checkSchemaResult: CheckSchema_service_checkSchema;
  serviceName: string;
  tag: string;
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
🔄 Validated your local schema against schema tag \`${tag}\` on service \`${serviceName}\`.
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

🔗 [View your service check details](${checkSchemaResult.targetUrl}).
`;
}

export function formatHumanReadable({
  checkSchemaResult
}: {
  checkSchemaResult: CheckSchema_service_checkSchema;
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
    result += `\n\nView full details at: ${targetUrl}`;
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
      exclusive: ["markdown"]
    }),
    localSchemaFile: flags.string({
      description:
        "Path to your local GraphQL schema file (introspection result or SDL)"
    }),
    markdown: flags.boolean({
      description: "Output result in markdown.",
      exclusive: ["json"]
    }),
    federated: flags.boolean({
      char: "f",
      default: false,
      description:
        "Indicates that the schema is a partial schema from a federated service"
    }),
    serviceName: flags.string({
      description:
        "Provides the name of the implementing service for a federated graph"
    })
  };

  async run() {
    // @ts-ignore we're goign to populate `taskOutput` later
    const taskOutput: TasksOutput = {};

    // Define this constant so we can throw it and compare against the same value.
    const breakingChangesErrorMessage = "breaking changes found";
    const compositionErrorMessage = "composition errors found";

    try {
      await this.runTasks<TasksOutput>(
        ({ config, flags, project }) =>
          flags.federated
            ? [
                {
                  title: "Checking service for changes",
                  task: async (ctx: TasksOutput, task) => {
                    taskOutput.shouldOutputJson = flags.json;

                    if (!config.name) {
                      throw new Error("No service found to link to Engine");
                    }

                    const info = await (project as GraphQLServiceProject).resolveFederationInfo();

                    if (!info.sdl)
                      throw new Error("No SDL found for federated service");

                    /**
                     * id: service id for root mutation (graph id)
                     * variant: like a tag. prod/staging/etc
                     * name: implementing service name inside of the graph
                     * sha: git commit hash/docker id. placeholder for now
                     */
                    const {
                      errors,
                      warnings,
                      compositionValidationDetails
                    } = await project.engine.checkPartialSchema({
                      id: config.name,
                      graphVariant: config.tag,
                      implementingServiceName: flags.serviceName || info.name,
                      partialSchema: {
                        sdl: info.sdl
                      }
                    });

                    // FIXME: reformat to match other check results

                    taskOutput.federation = {
                      errors,
                      warnings
                    };

                    if (compositionValidationDetails) {
                      taskOutput.federation.schemaHash =
                        compositionValidationDetails.schemaHash;
                    }
                  }
                },
                {
                  title: "Reporting result",
                  task: async (ctx: TasksOutput, task) => {
                    if (taskOutput.federation) {
                      const { errors, warnings } = taskOutput.federation;

                      task.title = `Found ${pluralize(
                        chalk.blue(errors.length.toString()),
                        "error"
                      )} and ${pluralize(
                        chalk.blue(warnings.length.toString()),
                        "warning"
                      )}`;

                      if (errors.length > 0) {
                        // Throw an error here to produce a red X in the list of steps being taken. We're going to
                        // `catch` this error below and proceed with the reporting.
                        throw new Error(compositionErrorMessage);
                      }
                    }
                  }
                }
              ]
            : [
                {
                  title: "Checking service for changes",
                  task: async (ctx: TasksOutput, task) => {
                    if (!config.name) {
                      throw new Error("No service found to link to Engine");
                    }

                    const tag = flags.tag || config.tag || "current";

                    task.title = `Validating local schema against tag ${chalk.blue(
                      tag
                    )} on service ${chalk.blue(config.name)}`;

                    task.output = "Resolving schema";

                    const schema = await project.resolveSchema({ tag });
                    await gitInfo(this.log);

                    const historicParameters = validateHistoricParams({
                      validationPeriod: flags.validationPeriod,
                      queryCountThreshold: flags.queryCountThreshold,
                      queryCountThresholdPercentage:
                        flags.queryCountThresholdPercentage
                    });

                    const variables: CheckSchemaVariables = {
                      id: config.name,
                      // @ts-ignore
                      // XXX Looks like TS should be generating ReadonlyArrays instead
                      schema: introspectionFromSchema(schema).__schema,
                      tag: flags.tag,
                      gitContext: await gitInfo(this.log),
                      frontend: flags.frontend || config.engine.frontend,
                      ...(historicParameters && { historicParameters })
                    };
                    const { schema: _, ...restVariables } = variables;
                    this.debug("Variables sent to Engine:");
                    this.debug(restVariables);
                    this.debug("SDL of introspection sent to Engine:");
                    this.debug(printSchema(schema));

                    task.output = "Validating schema";

                    const newContext: typeof ctx = {
                      checkSchemaResult: await project.engine.checkSchema(
                        variables
                      ),
                      config,
                      shouldOutputJson: !!flags.json,
                      shouldOutputMarkdown: !!flags.markdown
                    };

                    Object.assign(ctx, newContext);

                    // Save the output because we're going to use it even if we throw. `runTasks` won't return
                    // anything if we throw.
                    Object.assign(taskOutput, ctx);

                    task.title = `Validated local schema against tag ${chalk.blue(
                      tag
                    )} on service ${chalk.blue(config.name)}`;
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

                    task.title = `Compared ${chalk.blue(
                      schemaChanges.length.toString()
                    )} schema ${pluralize(
                      schemaChanges.length,
                      "change"
                    )} against ${chalk.blue(
                      numberOfCheckedOperations.toString()
                    )} ${pluralize(numberOfCheckedOperations, "operation")}${
                      hours
                        ? ` over the last ${chalk.blue(
                            formatTimePeriod(hours)
                          )}`
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

                    task.title = `Found ${chalk.blue(
                      breakingSchemaChangeCount.toString()
                    )} breaking ${pluralize(
                      breakingSchemaChangeCount,
                      "change"
                    )} and ${chalk.blue(
                      nonBreakingSchemaChangeCount.toString()
                    )} compatible ${pluralize(
                      nonBreakingSchemaChangeCount,
                      "change"
                    )}`;

                    if (breakingSchemaChangeCount) {
                      // Throw an error here to produce a red X in the list of steps being taken. We're going to
                      // `catch` this error below and proceed with the reporting.
                      throw new Error(breakingChangesErrorMessage);
                    }
                  }
                }
              ],
        context => ({
          // It would be better here to use a custom renderer that will output the `Listr` output to stderr and
          // the `this.log` output to `stdout`.
          //
          // @see https://github.com/SamVerschueren/listr#renderer
          renderer:
            context.flags.markdown || context.flags.json ? "silent" : "default"
        })
      );
    } catch (error) {
      if (
        error.message !== breakingChangesErrorMessage &&
        error.message !== compositionErrorMessage
      ) {
        throw error;
      }
    }

    if (taskOutput.federation) {
      if (taskOutput.shouldOutputJson) {
        this.log(JSON.stringify(taskOutput.federation, null, 2));
        return;
      }

      table(
        [
          {},
          ...taskOutput.federation.errors.map(error =>
            formatFederationChange(
              ChangeSeverity.FAILURE,
              error ? error.message : ""
            )
          ),
          // Add an empty line between, but only if there are both breaking changes and non-breaking changes.
          taskOutput.federation.warnings.length &&
          taskOutput.federation.errors.length
            ? {}
            : null,
          ...taskOutput.federation.warnings.map(error =>
            formatFederationChange(
              ChangeSeverity.WARNING,
              error ? error.message : ""
            )
          )
        ].filter(Boolean),
        {
          columns: [
            { key: "type", label: "Change" },
            { key: "message", label: "Message" }
          ],
          // Override `printHeader` so we don't print a header
          printHeader: () => {}
        }
      );

      return;
    }

    const {
      checkSchemaResult,
      config,
      shouldOutputJson,
      shouldOutputMarkdown
    } = taskOutput;

    // This _should_ always be here; but TypeScript tells us that's optional. If we check it here, then
    // passing `config` to any other function will signify that `config.service` might now be null or
    // undefined. Save it as a const to tell TypeScript `service` can't be changed.

    const { service } = config;
    if (!service) {
      throw new Error(
        "Service mising from config. This should have been validated elsewhere"
      );
    }

    if (shouldOutputJson) {
      return this.log(
        JSON.stringify(
          {
            targetUrl: checkSchemaResult.targetUrl,
            changes: checkSchemaResult.diffToPrevious.changes,
            validationConfig: checkSchemaResult.diffToPrevious.validationConfig
          },
          null,
          2
        )
      );
    } else if (shouldOutputMarkdown) {
      const serviceName = config.service && config.service.name;

      if (!serviceName) {
        throw new Error(
          "The service name should have been defined in the Apollo config and validated when the config was loaded. Please file an issue if you're seeing this error."
        );
      }

      return this.log(
        formatMarkdown({
          checkSchemaResult,
          serviceName,
          tag: config.tag
        })
      );
    }

    this.log(formatHumanReadable({ checkSchemaResult }));

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
