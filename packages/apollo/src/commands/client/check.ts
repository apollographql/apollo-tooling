import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { print } from "graphql";

import { gitInfo } from "../../git";
import { ChangeType, format, SchemaChange as Change } from "../../diff";
import { ClientCommand } from "../../Command";

export default class ClientCheck extends ClientCommand {
  static description = "Check a client project against a pushed service";
  static flags = {
    ...ClientCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to check this client against",
      default: "current"
    })
  };

  async run() {
    const { changes }: any = await this.runTasks(
      ({ flags, project, config }) => [
        {
          title: "Checking client compatibility with service",
          task: async ctx => {
            ctx.gitContext = await gitInfo();

            const operations = Object.values(
              this.project.mergedOperationsAndFragmentsForService
            ).map(doc => ({ document: print(doc) }));

            const { changes } = await project.engine.checkOperations({
              id: config.name,
              operations,
              tag: flags.tag,
              gitContext: ctx.gitContext
            });

            ctx.changes = changes;
          }
        }
      ]
    );

    const failures = changes.filter(
      ({ type }: Change) => type === ChangeType.FAILURE
    );

    const exit = failures.length > 0 ? 1 : 0;

    if (changes.length === 0) {
      return this.log("\nAll operations are valid against service\n");
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
    this.exit(exit);
  }
}
