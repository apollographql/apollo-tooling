import { flags } from "@oclif/command";
import { introspectionFromSchema, printSchema } from "graphql";
import { writeFileSync } from "fs";

import { ClientCommand } from "../../Command";

export default class SchemaDownload extends ClientCommand {
  static description = "Download a schema from engine or a GraphQL endpoint.";

  static flags = {
    ...ClientCommand.flags,

    target: flags.string({
      description:
        "Format of schema to be downloaded i.e. JSON or SDL. Default is JSON"
    })
  };

  static args = [
    {
      name: "output",
      description: "Path to write the introspection result to"
    }
  ];

  async run() {
    let result;
    let gitContext;
    await this.runTasks(({ args, project, flags }) => {
      const isSDLFormat = flags.target && flags.target.toUpperCase() === "SDL";
      const output =
        args.output || (isSDLFormat ? "schema.graphql" : "schema.json");
      return [
        {
          title: `Saving schema to ${output}`,
          task: async () => {
            const schema = await project.resolveSchema({ tag: flags.tag });
            const formattedSchema = isSDLFormat
              ? printSchema(schema)
              : JSON.stringify(introspectionFromSchema(schema), null, 2);
            writeFileSync(output, formattedSchema);
          }
        }
      ];
    });
  }
}
