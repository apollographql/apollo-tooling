import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";

import { ProjectCommand } from "../../Command";

export default class ServiceDownload extends ProjectCommand {
  static description = "Download the schema from your GraphQL endpoint.";

  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to check this service against",
      default: "current"
    })
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
