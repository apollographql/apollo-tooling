import React from "react";
import { GraphQLClientProject } from "apollo-language-server";
import { writeFileSync } from "fs";

import {
  getOperationManifestFromProject,
  ManifestEntry
} from "../../utils/getOperationManifestFromProject";
import ApolloCommand, {
  useConfig,
  useOclif,
  useProject,
  clientFlags
} from "../../NewCommand";
import { Text, Color, Box } from "ink";
import { Task, Tasks, useTask } from "../../components";

export default class Extract extends ApolloCommand {
  static description = "Extract queries from a client project";
  static type: "service" | "client" = "client";
  static flags = {
    ...ApolloCommand.flags,
    ...clientFlags
  };

  static args = [
    {
      name: "output",
      description: "Path to write the extracted queries to",
      required: true,
      default: "manifest.json"
    }
  ];

  render() {
    const config = useConfig();
    const {
      args: { output: filename }
    } = useOclif();
    const project = useProject();

    const [operations, extract] = useTask<ManifestEntry[]>(async () => {
      await project.whenReady;
      return getOperationManifestFromProject(project as GraphQLClientProject);
    });

    const [, writeToFile] = useTask(async () => {
      writeFileSync(
        filename,
        JSON.stringify({ version: 2, operations }, null, 2)
      );
    });

    return (
      <Tasks>
        <Task task={extract} title="Extracting operations from project" />
        <Task
          task={writeToFile}
          title={`Outputing extracted queries to ${filename}`}
          done={() => {
            return (
              <Box marginTop={1}>
                <Text>
                  Successfully wrote{" "}
                  <Color cyan>{operations ? operations.length : ""}</Color>{" "}
                  operations from the <Color cyan>{config.client!.name}</Color>{" "}
                  client to <Color cyan>{filename}</Color>
                </Text>
              </Box>
            );
          }}
        />
      </Tasks>
    );
  }
}
