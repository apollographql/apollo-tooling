import Command, { flags } from "@oclif/command";
import * as Parser from "@oclif/parser";
import React, { useEffect, useState, useContext } from "react";
import { render as renderInk, Color, Box } from "ink";
import { DeepPartial, fetch } from "apollo-env";
import {
  GraphQLProject,
  loadConfig,
  ApolloConfig,
  getServiceFromKey,
  Debug,
  isClientConfig,
  isServiceConfig
} from "apollo-language-server";
import { parse, resolve } from "path";
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink,
  NormalizedCacheObject
} from "@apollo/client";
// import { any } from "prop-types";
const { version, referenceID } = require("../package.json");

const headersArrayToObject = (
  arr?: string[]
): Record<string, string> | undefined => {
  if (!arr) return;
  return arr
    .map(val => JSON.parse(val))
    .reduce((pre, next) => ({ ...pre, ...next }), {});
};

// XXX how to get the flags correctly
export const OclifContext = React.createContext<Parser.Output<any, any> | null>(
  null
);
export const ConfigContext = React.createContext<ApolloConfig | void>(
  undefined
);

const defaultFlags = {
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
  })
};

type CommandState = {
  client: ApolloClient<NormalizedCacheObject>;
  config: ApolloConfig;
  oclif: Parser.Output<any, any>;
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

  /**
   * 1. using command flags, determine what kind of project this is,
   *    where to get the config, and then load the config from file or defaults
   */
  async loadConfigFromFlags(flags: Record<string, any>, service: string) {
    const config = await loadConfig({
      configPath: flags.config && parse(resolve(flags.config)).dir,
      configFileName: flags.config,
      name: service,
      type: this.type // how do we set this for client projects?
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
    if (this.configMap) {
      const defaults = this.configMap(flags);
      config.setDefaults(defaults);
    }

    return config;
  }

  async run() {
    const App = (props: { children?: React.Component }) => {
      const children = props.children;
      if (!children) return null;

      const [command, setCommandReady] = useState<CommandState | void>();

      // this useEffect hook loads the config and sets the
      // state.command to { client: ApolloClient, config: ApolloConfig, oclif: Parser.Output }
      // rendering waits until this effect sets the command state.
      useEffect(() => {
        const oclif = this.parse(ApolloCommand);
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
            setCommandReady({
              client,
              config,
              oclif
            });
          })
          .catch(e => {
            /// XXX what do we do with this error
          });
      });

      if (!command) {
        return null; // XXX return some interstitial loading state (This should be near instant however)
      }

      return (
        <OclifContext.Provider value={command.oclif}>
          <ConfigContext.Provider value={command.config}>
            <ApolloProvider client={command.client}>{children}</ApolloProvider>
          </ConfigContext.Provider>
        </OclifContext.Provider>
      );
    };

    const { waitUntilExit } = renderInk(
      <ErrorBoundary>
        <App />
      </ErrorBoundary>,
      {
        debug: process.env.DEBUG === "true"
      }
    );

    await waitUntilExit();
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
