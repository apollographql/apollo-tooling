import React from "react";
import { introspectionFromSchema, printSchema, GraphQLSchema } from "graphql";
import { writeFileSync } from "fs";
import ApolloCommand, {
  useOclif,
  useProject,
  clientFlags
} from "../../NewCommand";
import { Task, Tasks, useTask } from "../../components/";
import { Text, Color, Box } from "ink";

export default class SchemaDownloadReact extends ApolloCommand {
  static description =
    "Download a schema from engine or a GraphQL endpoint in JSON or SDL format";
  protected type: "service" | "client" = "client";
  static args = [
    {
      name: "output",
      description:
        "Path to write the introspection result to. Can be `.graphql`, `.gql`, `.graphqls`, or `.json`",
      required: true,
      default: "schema.json"
    }
  ];

  static flags = {
    ...ApolloCommand.flags,
    ...clientFlags
  };

  render() {
    const { args, flags } = useOclif();
    const project = useProject();

    const extension = args.output.split(".").pop();
    const isSDLFormat = ["graphql", "graphqls", "gql"].includes(extension);

    const [schema, loadProject] = useTask<GraphQLSchema>(async () => {
      await project.whenReady;
      return await project.resolveSchema({ tag: flags.tag });
    });

    const [written, writeFile] = useTask<boolean>(async () => {
      if (!schema) throw new Error("Unable to load schema");
      const formattedSchema = isSDLFormat
        ? printSchema(schema)
        : JSON.stringify(introspectionFromSchema(schema), null, 2);
      writeFileSync(args.output, formattedSchema);
      return true;
    });

    return (
      <Box>
        <Tasks>
          <Task task={loadProject} title="Loading schema" />
          <Task task={writeFile} title={`Writing file to ${args.output}`} />
        </Tasks>
        {written && <Text>File written to {args.output}</Text>}
      </Box>
    );
  }
}
