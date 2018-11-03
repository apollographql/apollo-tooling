import Command, { flags } from "@oclif/command";

import {
  GraphQLServiceProject,
  loadConfig,
  ServiceConfigFormat,
  ApolloConfigFormat,
  isService
} from "apollo-language-server";
import { LoadingHandler } from "./LoadingHandler";

export abstract class GraphQLServiceCommand extends Command {
  static args = [{ name: "serviceName" }];
  static flags = {
    config: flags.string({
      char: "c",
      description: "Path to your Apollo config file"
    }),
    key: flags.string({
      description: "The API key for the Apollo Engine service",
      default: () => process.env.ENGINE_API_KEY
    }),
    engine: flags.string({
      description: "Reporting URL for a custom Apollo Engine deployment",
      hidden: true
    })
  };

  public service?: GraphQLServiceProject;
  public loadingHandler: LoadingHandler;

  constructor(argv, config) {
    super(argv, config);
    this.loadingHandler = new LoadingHandler(this);
  }
  async init() {
    // do some initialization
    const { flags, args } = this.parse(this.constructor as any);
    let loadedConfig = await loadConfig({
      cwd: flags.config
    });
    if (!loadedConfig) throw new Error("No Apollo config found");

    let { config, filepath } = loadedConfig;
    if (!isService(config)) {
      throw new Error(`Apollo config missing service definition, try adding
{
  service: {
    name: "graphql-service"
  }
}

to your Apollo config found at ${filepath}`);
    }

    this.service = new GraphQLServiceProject(
      config,
      // XXX how can we unify this?
      this.loadingHandler as any,
      filepath
    );
  }
  async catch(err) {
    // handle any error from the command
  }
  async finally(err) {
    // called after run and catch regardless of whether or not the command errored
  }
}
