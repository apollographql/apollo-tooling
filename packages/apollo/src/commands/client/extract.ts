import { flags } from "@oclif/command";
import { writeFileSync } from "fs";
import { ClientCommand } from "../../Command";
import {
  getOperationManifestFromProject,
  ManifestEntry,
} from "../../utils/getOperationManifestFromProject";
import { ClientIdentity } from "apollo-language-server";

export default class ClientExtract extends ClientCommand {
  static description = "Extract queries from a client";
  static flags = {
    ...ClientCommand.flags,
    preserveStringAndNumericLiterals: flags.boolean({
      description:
        "Disable redaction of string and numerical literals.  Without this flag, these values will be replaced" +
        " with empty strings (`''`) and zeroes (`0`) respectively.  This redaction is intended to avoid " +
        " inadvertently outputting potentially personally identifiable information (e.g. embedded passwords " +
        " or API keys) into operation manifests",
      default: false,
    }),
  };

  static args = [
    {
      name: "output",
      description: "Path to write the extracted queries to",
      required: true,
      default: "manifest.json",
    },
  ];

  async run() {
    const { clientIdentity, operations, filename } = await this.runTasks<{
      clientIdentity: ClientIdentity;
      operations: ManifestEntry[];
      filename: string;
    }>(({ flags, project, config, args }) => [
      {
        title: "Extracting operations from project",
        task: async (ctx) => {
          ctx.operations = getOperationManifestFromProject(this.project, {
            preserveStringAndNumericLiterals:
              flags.preserveStringAndNumericLiterals,
          });
          ctx.clientIdentity = config.client;
        },
      },
      {
        title: "Outputing extracted queries",
        task: (ctx, task) => {
          const filename = args.output;
          task.title = "Outputing extracted queries to " + filename;
          ctx.filename = filename;
          writeFileSync(
            filename,
            JSON.stringify({ version: 2, operations: ctx.operations }, null, 2)
          );
        },
      },
    ]);

    this.log(
      `Successfully wrote ${operations.length} operations from the ${clientIdentity.name} client to ${filename}`
    );
  }
}
