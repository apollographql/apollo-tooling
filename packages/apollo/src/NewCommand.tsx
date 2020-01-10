import Command, { flags } from "@oclif/command";
import * as Parser from "@oclif/parser";
import React, { useEffect, useState, useContext } from "react";
import { render as renderInk, Color, Box } from "ink";
import { DeepPartial, fetch, WithRequired } from "apollo-env";
import {
  GraphQLProject,
  loadConfig,
  ApolloConfig,
  getServiceFromKey,
  Debug,
  isClientConfig,
  isServiceConfig,
  GraphQLServiceProject,
  GraphQLClientProject
} from "apollo-language-server";
import { parse, resolve } from "path";
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  NormalizedCacheObject
} from "@apollo/client";
import URI from "vscode-uri";
import { OclifLoadingHandler } from "./OclifLoadingHandler";
const { version, referenceID } = require("../package.json");

const headersArrayToObject = (
  arr?: string[]
): Record<string, string> | undefined => {
  if (!arr) return;
  return arr
    .map(val => JSON.parse(val))
    .reduce((pre, next) => ({ ...pre, ...next }), {});
};

export const OclifContext = React.createContext<Parser.Output<any, any> | null>(
  null
);
export const ConfigContext = React.createContext<ApolloConfig | void>(
  undefined
);
export const ProjectContext = React.createContext<GraphQLProject | void>(
  undefined
);

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

export const defaultFlags = {
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
    description:
      "Additional header to send to server for introspectionQuery. May be used multiple times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED if using the `--header` flag."
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
  }),
  // TODO: Is this _supposed_ to be on the base class? It's checked, but
  // was never described here. It _was_ on the service:download command only
  skipSSLValidation: flags.boolean({
    char: "k",
    description: "Allow connections to an SSL site without certs"
  }),
  // TODO: same with this flag. SHOULD it be here?
  localSchemaFile: flags.string({
    description:
      "Path to one or more local GraphQL schema file(s) that make up a single schema, as introspection result or SDL. Supports comma-separated list of paths (ex. `--localSchemaFile=schema.graphql,extensions.graphql`)"
  })
};

// TODO 3.0: get rid of the need for this set of client-only flags at the root.
// remove the ClientCommand class extension below
export const clientFlags = {
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

type CommandState = {
  client: ApolloClient<NormalizedCacheObject>;
  config: ApolloConfig;
  oclif: Parser.Output<any, any>;
  project: GraphQLProject;
};

export default class ApolloCommand extends Command {
  static flags = defaultFlags;

  public project!: GraphQLProject;
  protected type: "service" | "client" = "service";

  protected configMap?: (flags: any) => DeepPartial<ApolloConfig>;

  async init() {
    // tell the language server to use the built-in loggers
    // from oclif
    Debug.SetLoggers({
      info: this.log,
      warning: this.warn,
      error: console.error
    });
  }

  render(): React.ReactElement {
    throw new Error("Render not implemented for command");
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
      return new GraphQLServiceProject({
        config,
        loadingHandler,
        rootURI,
        clientIdentity
      });
    } else if (isClientConfig(config)) {
      return new GraphQLClientProject({
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
  }

  /**
   * 1. determine what kind of project this is.
   * 2. Using the flags, figure out where to get the config
   *    and then load the config from file or defaults
   */
  async loadConfigFromFlags(flags: Record<string, any>, service?: string) {
    const config = await loadConfig({
      configPath: flags.config && parse(resolve(flags.config)).dir,
      configFileName: flags.config,
      name: service,
      type: this.type
    });

    if (!config)
      throw new Error(
        "A config failed to load, so the command couldn't be run"
      );

    config.tag = flags.tag || config.tag || "current";
    // flag overrides
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

    // this can set a single or multiple local schema files
    if (flags.localSchemaFile) {
      const files = flags.localSchemaFile.split(",");
      if (isClientConfig(config)) {
        config.setDefaults({
          client: {
            service: {
              localSchemaFile: files
            }
          }
        });
      } else if (isServiceConfig(config)) {
        config.setDefaults({
          service: {
            localSchemaFile: files
          }
        });
      }
    }

    // load per command type defaults;
    // it looks like this is so extending commands can
    // set defaults on the config object at runtime
    if (this.configMap) {
      if (this.type === "client") {
        const overrides = this.getConfigOverridesForClientCommands(flags);
        config.setDefaults(overrides);
      }
    }

    return config;
  }

  async run() {
    const App = (props: { children?: any }) => {
      const children = props.children;
      if (!children) return null;

      const [command, setCommandReady] = useState<CommandState | void>();

      // this useEffect hook loads the config and sets the
      // state.command to { client: ApolloClient, config: ApolloConfig, oclif: Parser.Output }
      // rendering waits until this effect sets the command state.
      useEffect(() => {
        const oclif = this.parse(this.constructor as Parser.Input<any>);
        const service = oclif.flags.key
          ? getServiceFromKey(oclif.flags.key)
          : undefined;
        this.loadConfigFromFlags(oclif.flags, service)
          .then(config => {
            if (!config) throw new Error("Could not load config");
            const client = new ApolloClient({
              name: "Apollo CLI",
              version,
              link: new HttpLink({
                uri: config.engine.endpoint,
                headers: {
                  "x-api-key": config.engine.apiKey || service,
                  "apollo-client-reference-id": referenceID
                },
                fetch: fetch as any
              }),
              cache: new InMemoryCache()
            });
            const project = this.createService(config, oclif.flags);
            setCommandReady({
              client,
              config,
              oclif,
              project
            });
            return config;
          })
          .catch(e => {
            console.error(e);
            this.exit(1);
          });
      }, []);

      if (!command) {
        return null; // XXX return some interstitial loading state (This should be near instant however)
      }

      return (
        <OclifContext.Provider value={command.oclif}>
          <ConfigContext.Provider value={command.config}>
            <ProjectContext.Provider value={command.project}>
              <ApolloProvider client={command.client}>
                {children}
              </ApolloProvider>
            </ProjectContext.Provider>
          </ConfigContext.Provider>
        </OclifContext.Provider>
      );
    };

    const Comp = this.render;
    const { waitUntilExit } = renderInk(
      <ErrorBoundary>
        <App>
          <Comp />
        </App>
      </ErrorBoundary>,
      {
        debug: process.env.DEBUG === "true"
      }
    );

    await waitUntilExit();
  }

  getConfigOverridesForClientCommands(flags: any) {
    // TODO: SET CLASS TYPE
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
  }
}

/* Hooks */
export function useOclif<TFlags = any, TArgs = any>() {
  const output = useContext(OclifContext);
  if (!output) throw new Error("Could not load command");
  return output as Parser.Output<TFlags, TArgs>;
}

export function useConfig() {
  const output = useContext(ConfigContext);
  if (!output) throw new Error("Could not load config");
  return output;
}

export function useProject() {
  const output = useContext(ProjectContext);
  if (!output) throw new Error("Could not load project");
  return output;
}

interface ErrorBoundaryState {
  error?: Error;
}
export class ErrorBoundary extends React.Component<{}, ErrorBoundaryState> {
  state = {} as ErrorBoundaryState;

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }
    return (
      <Box>
        <Color red>An error occurred: {error.message}</Color>
      </Box>
    );
  }
}
