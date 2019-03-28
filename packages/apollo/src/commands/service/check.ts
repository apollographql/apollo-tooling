import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema } from "graphql";
import chalk from "chalk";
import { gitInfo, GitContext } from "../../git";
import { ProjectCommand } from "../../Command";
import { validateHistoricParams } from "../../utils";
import {
  CheckSchema_service_checkSchema,
  CheckSchema_service_checkSchema_diffToPrevious_changes as Change,
  ChangeType
} from "apollo-language-server/lib/graphqlTypes";
import { ApolloConfig } from "apollo-language-server";
import moment from "moment";

const formatChange = (change: Change) => {
  let color = (x: string): string => x;
  if (change.type === ChangeType.FAILURE) {
    color = chalk.red;
  }

  if (change.type === ChangeType.WARNING) {
    color = chalk.yellow;
  }

  return {
    type: color(change.type),
    code: color(change.code),
    description: color(change.description)
  };
};

interface TasksOutput {
  config: ApolloConfig;
  gitContext?: GitContext;
  checkSchemaResult: CheckSchema_service_checkSchema;
  shouldOutputJson: boolean;
  shouldOutputMarkdown: boolean;
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

  // This will always return a negative number of days. Use `-` to make it positive.
  const days = -moment()
    .add(validationConfig.from, "second")
    .diff(moment().add(validationConfig.to, "second"), "days");

  const breakingChanges = diffToPrevious.changes.filter(
    change => change.type === "FAILURE"
  );

  return `
### Apollo Service Check
🔄 Validated your local schema against schema tag \'${tag}\' on service \'${serviceName}\'.
🔢 Compared **${
    diffToPrevious.changes.length
  } schema changes** against operations seen over the **last ${
    days === 1 ? "day" : `${days} days`
  }**.
${
  breakingChanges.length > 0
    ? `❌ Found **${
        diffToPrevious.changes.filter(change => change.type === "FAILURE")
          .length
      } breaking changes** that would affect **${
        diffToPrevious.affectedQueries
          ? // Our schema allows `affectedQueries` to be `null` even if we have `breakingChanges`, so we have to
            // check for it :shrug:
            diffToPrevious.affectedQueries.length
          : "no"
      } operations**`
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
    diffToPrevious: { changes, validationConfig }
  } = checkSchemaResult;
  let result = "";
  const failures = changes.filter(({ type }) => type === ChangeType.FAILURE);

  if (changes.length === 0) {
    return "No changes present between schemas";
  }

  table(changes.map(formatChange), {
    columns: [
      { key: "type", label: "Change" },
      { key: "code", label: "Code" },
      { key: "description", label: "Description" }
    ],
    printLine: line => {
      result += `\n${line}`;
    }
  });

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
    markdown: flags.boolean({
      description: "Output result in markdown.",
      exclusive: ["json"]
    })
  };

  async run() {
    const {
      gitContext,
      checkSchemaResult,
      config,
      shouldOutputJson,
      shouldOutputMarkdown
    } = await this.runTasks<TasksOutput>(
      ({ config, flags, project }) => [
        {
          title: "Checking service for changes",
          task: async (ctx: TasksOutput) => {
            if (!config.name) {
              throw new Error("No service found to link to Engine");
            }

            const tag = flags.tag || config.tag || "current";
            const schema = await project.resolveSchema({ tag });
            ctx.gitContext = await gitInfo(this.log);

            const historicParameters = validateHistoricParams({
              validationPeriod: flags.validationPeriod,
              queryCountThreshold: flags.queryCountThreshold,
              queryCountThresholdPercentage: flags.queryCountThresholdPercentage
            });

            ctx.checkSchemaResult = await project.engine.checkSchema({
              id: config.name,
              // @ts-ignore
              // XXX Looks like TS should be generating ReadonlyArrays instead
              schema: introspectionFromSchema(schema).__schema,
              tag: flags.tag,
              gitContext: ctx.gitContext,
              frontend: flags.frontend || config.engine.frontend,
              ...(historicParameters && { historicParameters })
            });

            ctx.shouldOutputJson = !!flags.json;
            ctx.shouldOutputMarkdown = !!flags.markdown;
            ctx.config = config;
          }
        }
      ],
      context => ({
        // It would be better here to use a custom renderer that will output the `Listr` output to stderr and
        // the `this.log` output to `stdout`.
        //
        // @see https://github.com/SamVerschueren/listr#renderer
        renderer: context.flags.markdown ? "silent" : "default"
      })
    );

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
        ({ type }) => type === ChangeType.FAILURE
      )
    ) {
      this.exit();
    }
  }
}
