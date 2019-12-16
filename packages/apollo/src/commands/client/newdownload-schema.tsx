import React, { useEffect, useState } from "react";
import { introspectionFromSchema, printSchema } from "graphql";
import { writeFileSync } from "fs";

import ApolloCommand, {
  useOclif,
  useProject,
  clientFlags
} from "../../NewCommand";
import { TaskList } from "../../components/";

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

    const [running, setRunning] = useState([
      `Saving schema to ${args.output}`
    ] as Array<string | any>);
    const [done, setDone] = useState([] as Array<string | any>);

    const extension = args.output.split(".").pop();
    const isSDLFormat = ["graphql", "graphqls", "gql"].includes(extension);

    useEffect(() => {
      project.resolveSchema({ tag: flags.tag }).then(schema => {
        const formattedSchema = isSDLFormat
          ? printSchema(schema)
          : JSON.stringify(introspectionFromSchema(schema), null, 2);
        writeFileSync(args.output, formattedSchema);
        setDone(running);
        setRunning([]);
      });
    }, []);

    return <TaskList running={running} done={done} />;
  }
}
