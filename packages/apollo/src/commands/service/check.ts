import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema } from "graphql";

import { gitInfo } from "../../git";
import { ChangeType, format, SchemaChange as Change } from "../../diff";
import { ProjectCommand } from "../../Command";

export default class ServiceCheck extends ProjectCommand {
  static aliases = ["schema:check"];
  static description =
    "Check a service against known operation workloads to find breaking changes";
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to check this service against",
      default: "current"
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
            const schema = await project.resolveSchema({ tag: flags.tag });
            ctx.gitContext = await gitInfo();

            ctx.checkSchemaResult = await project.engine.checkSchema({
              id: config.name,
              schema: introspectionFromSchema(schema).__schema,
              tag: flags.tag,
              gitContext: ctx.gitContext,
              frontend: flags.frontend || config.engine!.frontend
              // historicParameters
            });
          }
        }
      ]
    );

    const { targetUrl, diffToPrevious } = checkSchemaResult;
    const { changes /*, type, validationConfig */ } = diffToPrevious;
    const failures = changes.filter(
      ({ type }: Change) => type === ChangeType.FAILURE
    );

    if (changes.length === 0) {
      return this.log("\nNo changes present between schemas\n");
    }
    this.log("\n");
    table(changes.map(format), {
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
