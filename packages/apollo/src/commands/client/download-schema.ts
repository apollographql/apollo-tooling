import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";

import { ClientCommand } from "../../Command";

export default class SchemaDownload extends ClientCommand {
  static description = "Download a schema from engine or a GraphQL endpoint.";

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
    await this.runTasks(({ args, project, flags }) => [
      {
        title: `Saving schema to ${args.output}`,
        task: async () => {
          const schema = await project.resolveSchema({ tag: flags.tag });
          writeFileSync(
            args.output,
            JSON.stringify(introspectionFromSchema(schema), null, 2)
          );
        }
      }
    ]);
  }
}
