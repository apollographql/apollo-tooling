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
  gitContext?: GitContext;
  checkSchemaResult: CheckSchema_service_checkSchema;
  shouldOutputJson: boolean;
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
        "Output result in json, which can then be parsed by CLI tools such as jq."
    })
  };

  async run() {
    const {
      gitContext,
      checkSchemaResult,
      shouldOutputJson
    } = await this.runTasks<TasksOutput>(({ config, flags, project }) => [
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

          ctx.shouldOutputJson = flags.json;
        }
      }
    ]);

    const {
      targetUrl,
      diffToPrevious: { changes, validationConfig }
    } = checkSchemaResult;
    const failures = changes.filter(({ type }) => type === ChangeType.FAILURE);

    if (shouldOutputJson) {
      return this.log(
        JSON.stringify({ targetUrl, changes, validationConfig }, null, 2)
      );
    }

    if (changes.length === 0) {
      return this.log("\nNo changes present between schemas\n");
    }
    this.log("\n");
    table(changes.map(formatChange), {
      columns: [
        { key: "type", label: "Change" },
        { key: "code", label: "Code" },
        { key: "description", label: "Description" }
      ]
    });
    this.log("\n");
    if (targetUrl) {
      this.log(`View full details at: ${targetUrl}`);
    }
    // exit with failing status if we have failures
    if (failures.length > 0) {
      this.exit();
    }
    return;
  }
}
