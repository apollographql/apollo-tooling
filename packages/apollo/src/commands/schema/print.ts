import { Command, flags } from "@oclif/command";
import { fs } from "apollo-codegen-core/lib/localfs";
import { promisify } from "util";

import { printSchema, buildClientSchema } from "graphql";

export default class SchemaDownload extends Command {
  static description =
    "Prints a schema from a json file containing an introspection result.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help"
    })
  };

  static args = [
    {
      name: "schema",
      required: true,
      description: "Path to your schema in json form",
      default: "./schema.json"
    }
  ];

  async run() {
    const { args } = this.parse(SchemaDownload);

    let schemaString;
    try {
      schemaString = (await promisify(fs.readFile)(args.schema)).toString();
    } catch (error) {
      this.error("File(" + args.schema + ") read failed with ", error);
      return;
    }

    let schema;
    try {
      schema = JSON.parse(schemaString);
    } catch (error) {
      this.error("schema loaded kis invalid json", error);
      return;
    }

    const executableSchema = buildClientSchema(schema);
    this.log(printSchema(executableSchema));
  }
}
