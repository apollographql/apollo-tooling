import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";

import { ClientCommand } from "../../Command";

export default class SchemaDownload extends ClientCommand {
  static description =
    "Download schema from Apollo Platform or a GraphQL endpoint";

  static flags = {
    ...ClientCommand.flags
  };

  static args = [
    {
      name: "output",
      description: "Path to write the introspection result to",
      required: true,
      default: "schema.json"
    }
  ];

  async run() {
    let result;
    let gitContext;
    await this.runTasks(({ args, project, config }) => [
      {
        title: `Saving schema to ${args.output}`,
        task: async () => {
          const schema = await project.resolveSchema({
            tag: config.variant
          });
          writeFileSync(
            args.output,
            JSON.stringify(introspectionFromSchema(schema), null, 2)
          );
        }
      }
    ]);
  }
}
