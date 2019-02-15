import { writeFileSync } from "fs";
import { ClientCommand } from "../../Command";
import {
  getOperationManifestFromProject,
  ManifestEntry
} from "../../utils/getOperationManifestFromProject";
import { ClientIdentity } from "apollo-language-server";

export default class ClientExtract extends ClientCommand {
  static description = "Extract queries from a client";
  static flags = {
    ...ClientCommand.flags
  };

  static args = [
    {
      name: "output",
      description: "Path to write the extracted queries to",
      required: true,
      default: "manifest.json"
    }
  ];

  async run() {
    const { clientIdentity, operations, filename } = await this.runTasks<{
      clientIdentity: ClientIdentity;
      operations: ManifestEntry[];
      filename: string;
    }>(({ flags, project, config, args }) => [
      {
        title: "Extracting operations from project",
        task: async ctx => {
          ctx.operations = getOperationManifestFromProject(this.project);
          ctx.clientIdentity = config.client;
        }
      },
      {
        title: "Outputing extracted queries",
        task: (ctx, task) => {
          const filename = args.output;
          task.title = "Outputing extracted queries to " + filename;
          ctx.filename = filename;
          writeFileSync(
            filename,
            JSON.stringify({ version: 1, operations: ctx.operations }, null, 2)
          );
        }
      }
    ]);

    this.log(
      `Successfully wrote ${operations.length} operations from the ${
        clientIdentity.name
      } client to ${filename}`
    );
  }
}
