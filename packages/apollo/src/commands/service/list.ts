import { flags } from "@oclif/command";
import { ProjectCommand } from "../../Command";
import { GraphQLSchema } from "graphql";
import sortBy from "lodash.sortby";
import { table } from "heroku-cli-util";
import moment from "moment";
import { ApolloConfig, isServiceProject } from "apollo-language-server";
import chalk from "chalk";
import {
  ListServices_service_implementingServices,
  ListServices_service_implementingServices_FederatedImplementingServices_services
} from "apollo-language-server/lib/graphqlTypes";

interface TasksOutput {
  config: ApolloConfig;
  implementingServices: ListServices_service_implementingServices | null;
}

const formatImplementingService = (
  implementingService: ListServices_service_implementingServices_FederatedImplementingServices_services
) => {
  return {
    name: implementingService.name,
    url: implementingService.url || "",
    updatedAt: `${moment(implementingService.updatedAt).format(
      "D MMMM YYYY"
    )} (${moment(implementingService.updatedAt).fromNow()})`
  };
};

function formatHumanReadable({
  implementingServices,
  graphName,
  frontendUrl
}: {
  implementingServices: ListServices_service_implementingServices | null;
  graphName: string | undefined;
  frontendUrl: string | undefined;
}): string {
  let result = "";
  if (
    !implementingServices ||
    implementingServices.__typename === "NonFederatedImplementingService"
  ) {
    result =
      "\nThis graph is not federated, there are no services composing the graph";
  } else if (implementingServices.services.length === 0) {
    result = "\nThere are no services on this federated graph";
  } else {
    // Create a sorted list of the services.
    const sortedImplementingServices = sortBy<
      ListServices_service_implementingServices_FederatedImplementingServices_services
    >(implementingServices.services, [service => service.name.toUpperCase()]);

    table(
      [...sortedImplementingServices.map(formatImplementingService)].filter(
        Boolean
      ),
      {
        columns: [
          { key: "name", label: "Name" },
          { key: "url", label: "Url" },
          { key: "updatedAt", label: "Last Updated At" }
        ],
        // Override `printHeader` so we don't print a header
        printHeader: () => {},
        // The default `printLine` will output to the console; we want to capture the output so we can test
        // it.
        printLine: line => {
          result += `\n${line}`;
        }
      }
    );
    const serviceListUrlEnding = `/service/${graphName}/service-list`;
    const targetUrl = frontendUrl
      ? `${frontendUrl}${serviceListUrlEnding}`
      : `https://engine.apollographql.com${serviceListUrlEnding}`;
    result += `\n\nView full details at: ${targetUrl}`;
  }
  return result;
}

export default class ServiceList extends ProjectCommand {
  static description = "List the services in a graph";
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag to list the services from"
    })
    // json: flags.boolean({
    //   description:
    //     "Output result in json, which can then be parsed by CLI tools such as jq.",
    //   exclusive: ["markdown"]
    // }),
  };

  async run() {
    // @ts-ignore we're going to populate `taskOutput` later
    const taskOutput: TasksOutput = {};

    let schema: GraphQLSchema | undefined;
    try {
      await this.runTasks<TasksOutput>(({ config, flags, project }) => {
        if (!isServiceProject(project)) {
          throw new Error(
            "This project needs to be configured as a service project but is configured as a client project. Please see bit.ly/2ByILPj for help regarding configuration."
          );
        }

        /**
         * Name of the graph being checked. `engine` is an example of a graph.
         *
         * A graph can be either a monolithic schema or the result of composition a federated schema.
         */
        const graphName = config.name;
        const tag = flags.tag || "current"; //|| config.tag || "current";

        if (!graphName) {
          throw new Error("No service found to link to Engine");
        }

        return [
          {
            title: `Fetching list of services for graph ${chalk.blue(
              graphName
            )}`,
            task: async (ctx: TasksOutput, task) => {
              const {
                implementingServices
              } = await project.engine.listServices({
                id: graphName,
                graphVariant: tag
              });
              const newContext: typeof ctx = {
                implementingServices,
                config
              };

              Object.assign(ctx, newContext);
              Object.assign(taskOutput, ctx);
            }
          }
        ];
      });
    } catch (error) {
      if (error.message.includes("/upgrade")) {
        this.exit(1);

        return;
      }
      throw error;
    }

    // This _should_ always be here; but TypeScript tells us that's optional. If we check it here, then
    // passing `config` to any other function will signify that `config.service` might now be null or
    // undefined. Save it as a const to tell TypeScript `service` can't be changed.

    const { service } = taskOutput.config;
    if (!service || !taskOutput.config) {
      throw new Error(
        "Service mising from config. This should have been validated elsewhere"
      );
    }
    this.log(
      formatHumanReadable({
        implementingServices: taskOutput.implementingServices,
        graphName: taskOutput.config.name,
        frontendUrl: taskOutput.config.engine.frontend
      })
    );
  }
}
