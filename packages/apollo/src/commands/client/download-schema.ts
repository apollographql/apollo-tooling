import { flags } from "@oclif/command";
import { introspectionFromSchema, printSchema } from "graphql";
import { writeFileSync } from "fs";

import { ClientCommand } from "../../Command";
import { PassthruRenderer } from "../../utils";

export default class SchemaDownload extends ClientCommand {
  static description =
    "Download a schema from engine or a GraphQL endpoint in JSON or SDL format";

  static flags = {
    ...ClientCommand.flags,
    json: flags.boolean({
      description:
        "Output result in json. If not specified, inferred from output file extension.",
      exclusive: ["sdl"]
    }),
    sdl: flags.boolean({
      description:
        "Output result in SDL. If not specified, inferred from output file extension.",
      exclusive: ["json"]
    }),
    "output-file": flags.string({
      char: "o",
      description:
        "Path to write the introspection result to. Can be `.graphql`, `.gql`, `.graphqls`, or `.json`. " +
        "Takes precedence over [OUTPUT] argument. " +
        "Use '-' to print the result directly to stdout."
    })
  };

  static args = [
    {
      name: "output",
      description:
        "[optional] " +
        "Path to write the introspection result to. Can be `.graphql`, `.gql`, `.graphqls`, or `.json`.",
      default: "schema.json"
    }
  ];

  async run() {
    let result;
    let gitContext;
    await this.runTasks(
      ({ args, project, flags }) => {
        const outputFile = flags["output-file"] || args.output;
        // treat '-' as stdout.
        const pipeToStdout = outputFile === "-";
        const extension = pipeToStdout ? "" : args.output.split(".").pop();
        const isSDLFormat =
          flags.sdl || ["graphql", "graphqls", "gql"].includes(extension);
        return [
          {
            title: `Saving schema to ${pipeToStdout ? "stdout" : args.output}`,
            task: async (ctx, task) => {
              const schema = await project.resolveSchema({ tag: flags.tag });
              const formattedSchema = isSDLFormat
                ? printSchema(schema)
                : JSON.stringify(introspectionFromSchema(schema), null, 2);
              if (pipeToStdout) {
                task.output = formattedSchema;
              } else {
                writeFileSync(args.output, formattedSchema);
              }
            }
          }
        ];
      },
      ({ flags }) => ({
        // don't render task status when rendering to stdout
        renderer: flags["output-file"] === "-" ? PassthruRenderer : "default"
      })
    );
  }
}
