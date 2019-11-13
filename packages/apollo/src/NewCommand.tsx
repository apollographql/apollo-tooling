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
  Debug
} from "apollo-language-server";
import { parse, resolve } from "path";
import {
  ApolloProvider,
  ApolloClient,
  InMemoryCache,
  HttpLink
} from "@apollo/client";
const { version, referenceID } = require("../package.json");

// XXX how to get the flags correctly
const OclifContext = React.createContext<Parser.Output<any, any> | null>(null);
const ConfigContext = React.createContext<ApolloConfig | void>(undefined);

export default class ApolloCommand extends Command {
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

  async run() {
    const Component = this.render;
    const oclif = this.parse(ApolloCommand);
    const service = oclif.flags.key
      ? getServiceFromKey(oclif.flags.key)
      : undefined;
    const config = await loadConfig({
      // configPath: flags.config && parse(resolve(flags.config)).dir,
      // configFileName: flags.config,
      name: service
      // type
    });
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

    const { waitUntilExit } = renderInk(
      <OclifContext.Provider value={oclif}>
        <ConfigContext.Provider value={config}>
          <ApolloProvider client={client}>
            <ErrorBoundary>
              <Component />
            </ErrorBoundary>
          </ApolloProvider>
        </ConfigContext.Provider>
      </OclifContext.Provider>,
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
class ErrorBoundary extends React.Component<{}, ErrorBoundaryState> {
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
