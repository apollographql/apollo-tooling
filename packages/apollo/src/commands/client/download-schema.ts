import { introspectionFromSchema, printSchema } from "graphql";
import { ClientCommand } from "../../Command";
import mkdirp from "mkdirp";
import fs from "fs";
import { dirname as getDirName } from "path";

export default class SchemaDownload extends ClientCommand {
  static description =
    "Download a schema from Apollo or a GraphQL endpoint in JSON or SDL format";

  static flags = {
    ...ClientCommand.flags,
  };

  static args = [
    {
      name: "output",
      description:
        "Path to write the introspection result to. Can be `.graphql`, `.gql`, `.graphqls`, or `.json`",
      required: true,
      default: "schema.json",
    },
  ];

  async run() {
    await this.runTasks(({ args, project, flags, config }) => {
      const extension = args.output.split(".").pop();
      const isSDLFormat = ["graphql", "graphqls", "gql"].includes(extension);
      return [
        {
          title: `Saving schema to ${args.output}`,
          task: async () => {
            const schema = await project.resolveSchema({ tag: config.variant });
            const formattedSchema = isSDLFormat
              ? printSchema(schema)
              : JSON.stringify(introspectionFromSchema(schema), null, 2);

            try {
              await mkdirp(getDirName(args.output));
              fs.writeFileSync(args.output, formattedSchema);
            } catch (err) {
              throw err;
            }
          },
        },
      ];
    });
  }
}
