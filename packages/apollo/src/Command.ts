import Command, { flags } from "@oclif/command";
import Listr from "listr";
import { ListrTask } from "listr";
import { parse, resolve } from "path";

import {
  GraphQLProject,
  GraphQLServiceProject,
  GraphQLClientProject,
  loadConfig,
  isClientConfig,
  isServiceConfig,
  ApolloConfig,
  getServiceFromKey
} from "apollo-language-server";
import { WithRequired, DeepPartial } from "apollo-env";
import { OclifLoadingHandler } from "./OclifLoadingHandler";
import URI from "vscode-uri";

const { version, referenceID } = require("../package.json");

export interface ProjectContext<Flags = any, Args = any> {
  project: GraphQLProject;
  config: ApolloConfig;
  flags: Flags;
  args: Args;
}

export interface Flags {
  config?: string;
  header?: string[];
  endpoint?: string;
  localSchemaFile?: string;
  key?: string;
  engine?: string;
  frontend?: string;
  tag?: string;
  skipSSLValidation?: boolean;
}

export interface ClientCommandFlags extends Flags {
  includes?: string;
  queries?: string;
  excludes?: string;
  tagName?: string;
  clientName?: string;
  clientReferenceId?: string;
  clientVersion?: string;
}

const headersArrayToObject = (
  arr?: string[]
): Record<string, string> | undefined => {
  if (!arr) return;
  return arr
    .map(val => JSON.parse(val))
    .reduce((pre, next) => ({ ...pre, ...next }), {});
};

export abstract class ProjectCommand extends Command {
  static flags = {
    config: flags.string({
      char: "c",
      description: "Path to your Apollo config file"
    }),
    header: flags.string({
      multiple: true,
      parse: header => {
        const separatorIndex = header.indexOf(":");
        const key = header.substring(0, separatorIndex).trim();
        const value = header.substring(separatorIndex + 1).trim();
        return JSON.stringify({ [key]: value });
      },
      description: "Additional headers to send to server for introspectionQuery"
    }),
    endpoint: flags.string({
      description: "The url of your service"
    }),
    key: flags.string({
      description: "The API key for the Apollo Engine service",
      default: () => process.env.ENGINE_API_KEY
    }),
    engine: flags.string({
      description: "Reporting URL for a custom Apollo Engine deployment",
      hidden: true
    }),
    frontend: flags.string({
      description: "URL for a custom Apollo Engine frontend",
      hidden: true
    })
  };

  public project!: GraphQLProject;
  public tasks: ListrTask[] = [];

  protected type: "service" | "client" = "service";
  protected configMap?: (flags: any) => DeepPartial<ApolloConfig>;
  private ctx!: ProjectContext;

  async init() {
    const { flags, args } = this.parse(this.constructor as any);
    this.ctx = { flags, args } as any;

    const config = await this.createConfig(flags);
    this.createService(config, flags);
    this.ctx.config = config;

    // make sure this the first item in the task list
    this.tasks.push({
      title: "Loading Apollo Project",
      task: async ctx => {
        await this.project.whenReady;
        ctx = { ...ctx, ...this.ctx };
      }
    });
  }

  protected async createConfig(flags: Flags) {
    const service = flags.key ? getServiceFromKey(flags.key) : undefined;
    const config = await loadConfig({
      configPath: flags.config && parse(resolve(flags.config)).dir,
      configFileName: flags.config,
      name: service,
      type: this.type
    });

    config.tag = flags.tag || config.tag || "current";
    //  flag overides
    config.setDefaults({
      engine: {
        apiKey: flags.key,
        endpoint: flags.engine,
        frontend: flags.frontend
      }
    });

    if (flags.endpoint) {
      config.setDefaults({
        service: {
          endpoint: {
            url: flags.endpoint,
            headers: headersArrayToObject(flags.header),
            ...(flags.skipSSLValidation && { skipSSLValidation: true })
          }
        }
      });
    }

    if (flags.localSchemaFile) {
      if (isClientConfig(config)) {
        config.setDefaults({
          client: {
            service: {
              localSchemaFile: flags.localSchemaFile
            }
          }
        });
      } else if (isServiceConfig(config)) {
        config.setDefaults({
          service: {
            localSchemaFile: flags.localSchemaFile
          }
        });
      }
    }

    // load per command type defaults;
    if (this.configMap) {
      const defaults = this.configMap(flags);
      config.setDefaults(defaults);
    }

    return config;
  }

  protected createService(config: ApolloConfig, flags: Flags) {
    const loadingHandler = new OclifLoadingHandler(this);

    // When no config is provided, configURI === process.cwd()
    // In this case, we don't want to look to the .dir since that's the parent
    const configPath = config.configURI!.fsPath;
    const rootURI =
      configPath === process.cwd()
        ? URI.file(configPath)
        : URI.file(parse(configPath).dir);

    const clientIdentity = {
      name: "Apollo CLI",
      version,
      referenceID
    };

    if (isServiceConfig(config)) {
      this.project = new GraphQLServiceProject({
        config,
        loadingHandler,
        rootURI,
        clientIdentity
      });
    } else if (isClientConfig(config)) {
      this.project = new GraphQLClientProject({
        config,
        loadingHandler,
        rootURI,
        clientIdentity
      });
    } else {
      throw new Error(
        "Unable to resolve project type. Please add either a client or service config. For more information, please refer to https://bit.ly/2ByILPj"
      );
    }

    this.ctx.project = this.project;
  }

  async runTasks<Result>(
    generateTasks: (context: ProjectContext) => ListrTask[]
  ): Promise<Result> {
    const tasks = await generateTasks(this.ctx!);
    return new Listr([...this.tasks, ...tasks]).run();
  }
  async catch(err) {
    // handle any error from the command
    this.error(err);
  }
  async finally(err) {
    // called after run and catch regardless of whether or not the command errored
  }
}

export abstract class ClientCommand extends ProjectCommand {
  static flags = {
    ...ProjectCommand.flags,
    clientReferenceId: flags.string({
      description:
        "Reference id for the client which will match ids from client traces, will use clientName if not provided"
    }),
    clientName: flags.string({
      description: "Name of the client that the queries will be attached to"
    }),
    clientVersion: flags.string({
      description:
        "The version of the client that the queries will be attached to"
    }),
    tag: flags.string({
      char: "t",
      description: "The published service tag for this client"
    }),
    queries: flags.string({
      description: "Deprecated in favor of the includes flag"
    }),
    includes: flags.string({
      description:
        "Glob of files to search for GraphQL operations. This should be used to find queries *and* any client schema extensions"
    }),
    excludes: flags.string({
      description:
        "Glob of files to exclude for GraphQL operations. Caveat: this doesn't currently work in watch mode"
    }),
    tagName: flags.string({
      description:
        "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code"
    })
  };
  public project!: GraphQLClientProject;
  constructor(argv, config) {
    super(argv, config);
    this.type = "client";
    this.configMap = (flags: ClientCommandFlags) => {
      const config = {
        client: {
          name: flags.clientName,
          referenceID: flags.clientReferenceId,
          version: flags.clientVersion
        }
      } as WithRequired<DeepPartial<ApolloConfig>, "client">;
      if (flags.endpoint) {
        config.client.service = {
          url: flags.endpoint,
          headers: headersArrayToObject(flags.header)
        };
      }

      if (flags.includes || flags.queries) {
        config.client.includes = [flags.includes || flags.queries];
      }

      if (flags.excludes) {
        config.client.excludes = [flags.excludes];
      }

      if (flags.tagName) {
        config.client.tagName = flags.tagName;
      }

      return config;
    };
  }
}
