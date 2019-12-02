import React, { Fragment, useEffect, useState } from "react";
import { Color, Box, Text } from "ink";
import Spinner from "ink-spinner";
import Table from "ink-table";

import ApolloCommand, {
  useConfig,
  useOclif,
  useProject,
  clientFlags
} from "../../NewCommand";
import { getOperationManifestFromProject } from "../../utils/getOperationManifestFromProject";
import { GraphQLClientProject } from "apollo-language-server";
import { writeFileSync } from "fs";
import { defaultFlags } from "@oclif/parser/lib/flags";

/**
 * This is an example of a multi-step command
 */
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
    const { flags, args } = useOclif();
    const project = useProject();

    const [running, setRunning] = useState([
      "Extracting operations from project"
    ] as string[]);
    const [done, setDone] = useState([] as string[]);
    const [operations, setOperations] = useState();

    useEffect(() => {
      setOperations(
        getOperationManifestFromProject(project as GraphQLClientProject)
      );
      setDone(running);
      setRunning(["Outputing extracted queries to: " + args.output]);
    }, []);

    useEffect(() => {
      if (!operations || done.length != 1) return;
      writeFileSync(
        args.output,
        JSON.stringify({ version: 2, operations }, null, 2)
      );
      setDone([
        ...done,
        ...running,
        `Successfully wrote ${operations.length} operations from the ${
          config.client!.name
        } client to ${args.output}`
      ]);
      setRunning([]);
    });

    return <Box>{printTaskTitles({ running, done })}</Box>;
  }
}

const printTaskTitles = ({
  running,
  done
}: {
  running: string[];
  done: string[];
}) => {
  return (
    <Box flexDirection={"column"} marginLeft={2}>
      {done.map(title => (
        <Text key={title}>
          <Color green>✔</Color> {title}
        </Text>
      ))}
      {running.map(title => (
        <Box key={title}>
          <Loader />
          <Text>{title}</Text>
        </Box>
      ))}
    </Box>
  );
};

const Loader = () => (
  <Box paddingRight={1} marginBottom={1}>
    <Color green>
      <Spinner type="dots" />
    </Color>
  </Box>
);
