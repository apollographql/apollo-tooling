import { flags } from "@oclif/command";
import { introspectionFromSchema } from "graphql";
import { writeFileSync } from "fs";
import chalk from "chalk";
import { ProjectCommand } from "../../Command";
import { DefaultEngineConfig, GraphQLProject } from "apollo-language-server";
import { table } from "table";
import moment from "moment";
import {
  CurrentGraphInformation_service,
  CurrentGraphInformation_service_mostRecentCompositionPublish
} from "apollo-language-server/lib/graphqlTypes";
import { formatServiceListHumanReadable } from "../service/list";
// import React, { Component } from "react";
// import { render, Color } from "ink";

// export const Test = () => {
//   return <Color green>Hello World</Color>;
// };

export function formatDateHumanReadable(date: Date) {
  return `${moment(date).format("D MMMM YYYY")} (${moment(date).from(
    new Date()
  )})`;
}

export default class GraphHello extends ProjectCommand {
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      name: "tag",
      char: "t",
      description: "The published tag to check this service against",
      default: "current"
    }),
    verbose: flags.boolean({
      name: "verbose",
      char: "v",
      description:
        "Whether to include verbose information about the graph's state",
      default: false
    })
  };
  async run() {
    let consoleResult: string = "\n";
    let compositionResult: CurrentGraphInformation_service_mostRecentCompositionPublish | null = null;
    await this.runTasks(
      ({
        args,
        project,
        flags,
        config
      }: {
        args: any;
        project: GraphQLProject;
        flags: any;
        config: any;
      }) => [
        {
          title: `Collecting graph info from Apollo Graph Manager`,
          task: async () => {
            console.log("wow");
            // render(Test());
          }
        }
      ]
    );

    this.log(consoleResult);
  }
}
