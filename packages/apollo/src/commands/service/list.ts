import { flags } from "@oclif/command";
import { ProjectCommand } from "../../Command";
import { GraphQLSchema } from "graphql";
import sortBy from "lodash.sortby";
import { table } from "table";
import moment from "moment";
import {
  ApolloConfig,
  isServiceProject,
  DefaultEngineConfig
} from "apollo-language-server";
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
  implementingService: ListServices_service_implementingServices_FederatedImplementingServices_services,
  effectiveDate: Date = new Date()
) => {
  return {
    name: implementingService.name,
    url: implementingService.url || "",
    updatedAt: `${moment(implementingService.updatedAt).format(
      "D MMMM YYYY"
    )} (${moment(implementingService.updatedAt).from(effectiveDate)})`
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

    console.log(
      table([
        ["Name", "URL", "Last Updated"],
        ...sortedImplementingServices
          .map(sortedImplementingService =>
            formatImplementingService(
              sortedImplementingService,
              // Force the time to a specific value if we're running tests. Otherwise the snapshots will break
              // when the relative time changes.
              process.env.NODE_ENV === "test"
                ? new Date("2019-06-13")
                : undefined
            )
          )
          .sort((s1, s2) =>
            s1.name.toUpperCase() > s2.name.toUpperCase() ? 1 : -1
          )
          .map(Object.values)
          .filter(Boolean)
      ])
    );

    const serviceListUrlEnding = `/graph/${graphName}/service-list`;
    const targetUrl = `${frontendUrl}${serviceListUrlEnding}`;
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
  };

  async run() {
    // @ts-ignore we're going to populate `taskOutput` later
    const taskOutput: TasksOutput = {};

    let schema: GraphQLSchema | undefined;
    let graphID: string | undefined;
    let graphVariant: string | undefined;
    try {
      await this.runTasks<TasksOutput>(({ config, flags, project }) => {
        /**
         * Name of the graph being checked. `engine` is an example of a graph.
         *
         * A graph can be either a monolithic schema or the result of composition a federated schema.
         */
        graphID = config.name;
        graphVariant = flags.tag || config.tag || "current";

        if (!graphID) {
          throw new Error("No service found to link to Engine");
        }

        return [
          {
            title: `Fetching list of services for graph ${chalk.blue(
              graphID + "@" + graphVariant
            )}`,
            task: async (ctx: TasksOutput, task) => {
              const {
                implementingServices
              } = await project.engine.listServices({
                id: graphID!,
                graphVariant: graphVariant!
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
    this.log(
      formatHumanReadable({
        implementingServices: taskOutput.implementingServices,
        graphName: taskOutput.config.name,
        frontendUrl:
          taskOutput.config.engine.frontend || DefaultEngineConfig.frontend
      })
    );
  }
}
