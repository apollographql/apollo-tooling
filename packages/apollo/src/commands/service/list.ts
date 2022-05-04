import { flags } from "@oclif/command";
import { ProjectCommand } from "../../Command";
import sortBy from "lodash.sortby";
import { table } from "table";
import moment from "moment";
import { ApolloConfig, DefaultEngineConfig } from "apollo-language-server";
import chalk from "chalk";
import {
  ListServices_service_implementingServices,
  ListServices_service_implementingServices_FederatedImplementingServices_services,
} from "apollo-language-server/lib/graphqlTypes";
import { graphUndefinedError } from "../../utils/sharedMessages";

interface TasksOutput {
  config: ApolloConfig;
  implementingServices: ListServices_service_implementingServices | null;
  frontendUrlRoot: string;
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
    )} (${moment(implementingService.updatedAt).from(effectiveDate)})`,
  };
};

function formatHumanReadable({
  implementingServices,
  graphName,
  frontendUrlRoot,
}: {
  implementingServices: ListServices_service_implementingServices | null;
  graphName: string | undefined;
  frontendUrlRoot: string;
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
    const sortedImplementingServices =
      sortBy<ListServices_service_implementingServices_FederatedImplementingServices_services>(
        implementingServices.services,
        [(service) => service.name.toUpperCase()]
      );

    console.log(
      table([
        ["Name", "URL", "Last Updated"],
        ...sortedImplementingServices
          .map((sortedImplementingService) =>
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
          .filter(Boolean),
      ])
    );

    const serviceListUrlEnding = `/graph/${graphName}/service-list`;
    const targetUrl = `${frontendUrlRoot}${serviceListUrlEnding}`;
    result += `\nView full details at: ${chalk.cyan(targetUrl)}\n`;
  }
  return result;
}

export default class ServiceList extends ProjectCommand {
  static description =
    "[DEPRECATED] List the services in a graph" +
    ProjectCommand.DEPRECATION_MSG;
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description:
        "[Deprecated: please use --variant instead] The tag (AKA variant) to list implementing services for",
      hidden: true,
      exclusive: ["variant"],
    }),
    variant: flags.string({
      char: "v",
      description: "The variant to list implementing services for",
      exclusive: ["tag"],
    }),
    graph: flags.string({
      char: "g",
      description:
        "The ID of the graph in the Apollo registry for which to list implementing services. Overrides config file if set.",
    }),
  };

  async run() {
    this.printDeprecationWarning();

    // @ts-ignore we're going to populate `taskOutput` later
    const taskOutput: TasksOutput = {};

    let graphID: string | undefined;
    let graphVariant: string | undefined;
    try {
      await this.runTasks<TasksOutput>(({ config, flags, project }) => {
        /**
         * Name of the graph we are listing implementing services of. `engine` is an example of a graph.
         *
         * A graph can be either a monolithic schema or the result of composition a federated schema.
         * This command only supports graphs that are federated into multiple implementing services.
         *
         */
        graphID = config.graph;
        graphVariant = config.variant;

        if (!graphID) {
          throw graphUndefinedError;
        }

        return [
          {
            title: `Fetching list of services for graph ${chalk.cyan(
              graphID + "@" + graphVariant
            )}`,
            task: async (ctx: TasksOutput, task) => {
              const { frontendUrlRoot, service } =
                await project.engine.listServices({
                  id: graphID!,
                  graphVariant: graphVariant!,
                });
              const { implementingServices } = service!;
              const newContext: typeof ctx = {
                implementingServices,
                frontendUrlRoot,
                config,
              };

              Object.assign(ctx, newContext);
              Object.assign(taskOutput, ctx);
            },
          },
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
        graphName: taskOutput.config.graph,
        frontendUrlRoot: taskOutput.frontendUrlRoot,
      })
    );
  }
}
