import React, { useEffect, useState } from "react";
import { GraphQLClientProject } from "apollo-language-server";
import { writeFileSync } from "fs";

import { getOperationManifestFromProject } from "../../utils/getOperationManifestFromProject";
import ApolloCommand, {
  useConfig,
  useOclif,
  useProject,
  clientFlags
} from "../../NewCommand";
import { TaskList } from "../../components/";

export default class ClientExtractReact extends ApolloCommand {
  static description = "Extract queries from a client project";
  protected type: "service" | "client" = "client";
  static args = [
    {
      name: "output",
      description: "Path to write the extracted queries to",
      required: true,
      default: "manifest.json"
    }
  ];
  static flags = {
    ...ApolloCommand.flags,
    ...clientFlags
  };

  render() {
    const config = useConfig();
    const { args } = useOclif();
    const project = useProject();

    const [running, setRunning] = useState([
      "Extracting operations from project"
    ] as Array<string | string[]>);
    const [done, setDone] = useState([] as Array<string | string[]>);
    const [operations, setOperations] = useState();

    // get operations from client project
    useEffect(() => {
      const operations = getOperationManifestFromProject(
        project as GraphQLClientProject
      );
      setOperations(operations);
      if (!operations) throw new Error("Operations could not be fetched");
      setDone(running);
      setRunning(["Outputing extracted queries to: " + args.output]);
    }, []);

    // waits until operations are fetched, writes file, and updates the "done" list
    useEffect(() => {
      if (!operations) return;
      writeFileSync(
        args.output,
        JSON.stringify({ version: 2, operations }, null, 2)
      );
      setDone([
        ...done,
        ...running,
        [
          "Successfully wrote",
          `%c ${operations.length}`,
          " operations from the",
          `%c ${config.client!.name}`,
          " client to",
          `%c ${args.output}`
        ]
      ]);
      setRunning([]);
    }, [operations]);

    return <TaskList running={running} done={done} />;
  }
}
