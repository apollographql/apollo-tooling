import { flags } from "@oclif/command";
import { introspectionFromSchema, printSchema } from "graphql";
import { writeFileSync } from "fs";

import { ClientCommand } from "../../Command";

export default class SchemaDownload extends ClientCommand {
  static description =
    "Download a schema from engine or a GraphQL endpoint in JSON or SDL format";

  static flags = {
    ...ClientCommand.flags
  };

  static args = [
    {
      name: "output",
      description:
        "Path to write the introspection result to. Can be `.graphql`, `.gql`, `.graphqls`, or `.json`",
      required: true,
      default: "schema.json"
    }
  ];

  async run() {
    let result;
    let gitContext;
    await this.runTasks(({ args, project, flags }) => {
      const extension = args.output.split(".").pop();
      const isSDLFormat = ["graphql", "graphqls", "gql"].includes(extension);
      return [
        {
          title: `Saving schema to ${args.output}`,
          task: async () => {
            const schema = await project.resolveSchema({ tag: flags.tag });
            const formattedSchema = isSDLFormat
              ? printSchema(schema)
              : JSON.stringify(introspectionFromSchema(schema), null, 2);
            writeFileSync(args.output, formattedSchema);
          }
        }
      ];
    });
  }
}
