import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema } from "graphql";
import chalk from "chalk";
import { gitInfo } from "../../git";
import { ProjectCommand } from "../../Command";
import { validateHistoricParams } from "../../utils";

// TODO These types can/should be generated from the engine schema when we
// dogfood codegen inside of the apollo-tooling repo
interface SchemaChange {
  type: ChangeType;
  code: string;
  description: string;
}
enum ChangeType {
  FAILURE = "FAILURE",
  WARNING = "WARNING",
  NOTICE = "NOTICE"
}

const formatChange = (change: SchemaChange) => {
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
    })
  };

  async run() {
    const { gitContext, checkSchemaResult }: any = await this.runTasks(
      ({ config, flags, project }) => [
        {
          title: "Checking service for changes",
          task: async ctx => {
            if (!config.name) {
              throw new Error("No service found to link to Engine");
            }

            const tag = flags.tag || config.tag || "current";
            const schema = await project.resolveSchema({ tag });
            ctx.gitContext = await gitInfo();

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
          }
        }
      ]
    );

    const { targetUrl, diffToPrevious } = checkSchemaResult;
    const { changes /*, type, validationConfig */ } = diffToPrevious;
    const failures = changes.filter(
      ({ type }: SchemaChange) => type === ChangeType.FAILURE
    );

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
    // exit with failing status if we have failures
    if (failures.length > 0) {
      this.exit();
    }
    return;
  }
}
