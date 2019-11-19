import React from "react";
import { render } from "ink-testing-library";
import stripAnsi from "strip-ansi";
import { MockedProvider } from "@apollo/client/testing";
import ApolloCommand, {
  ErrorBoundary,
  OclifContext,
  ConfigContext
} from "../NewCommand";
import * as Parser from "@oclif/parser";
import { ApolloConfig } from "apollo-language-server";
import { ParserOutput } from "@oclif/parser/lib/parse";

/*
  This test util should be used to test command classes that extend ApolloCommand. This is _not_ useful
  for testing the ApolloCommand base class, config parsing logic that happens outside of an individual
  command, or anything _not_ found in the individual command.

  To use, pass the implementing class (the command) to the function, along with
  mockable configuration, ApolloClient mocks, and CLI flags and args like so...

  const { lastFrame, frames, rerender } = executeCommand(ServiceList, {
    config: {
      name: "hello",
      engine: { frontend: "https://engine.apollographql.com" }
    },
    flags: { tag: "wow", key: "service:hello:2345824930" },
    mocks: mocks.federatedSuccess
  });

  This function returns a few tools to help with teting components.
  - The `lastFrame` is the last rendered output, with ANSI characters already stripped.
  - The `frames` array is a list of all the intermediate states of the command output when run.
  - `rerender` is a function that takes a time arg (in ms), waits that long, and rerenders the command
    - this is useful for getting the final state of an async command like so:

      expect(lastFrame()).toMatchInlineSnapshot(
      `"⠋ Fetching list of services for graph hello@wow"`
      );

      // final state -- wait until next tick
      await rerender(0);
      expect(lastFrame()).toMatchInlineSnapshot(`...`)

  This execution util uses the same ErrorBoundary that the actual runtime uses, so we can test
  error handling logic and rendering as well.
*/

export const executeCommand = (
  Command: any,
  { config, args, flags, mocks }: any
) => {
  const Component = new Command().render;
  const App = (
    <ErrorBoundary>
      <OclifContext.Provider value={{ flags, args } as Parser.Output<any, any>}>
        <ConfigContext.Provider value={config}>
          <MockedProvider addTypename={false} mocks={mocks}>
            <Component />
          </MockedProvider>
        </ConfigContext.Provider>
      </OclifContext.Provider>
    </ErrorBoundary>
  );

  const { rerender, lastFrame, frames } = render(App);
  return {
    lastFrame: () => stripAnsi(lastFrame()),
    frames,
    rerender: async (time = 0) => {
      await new Promise(r => setTimeout(r, time));
      rerender(App);
    }
  };
};
