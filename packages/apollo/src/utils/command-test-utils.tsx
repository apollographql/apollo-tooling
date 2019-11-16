import React from "react";
import { render } from "ink-testing-library";
import stripAnsi from "strip-ansi";
import { MockedProvider } from "@apollo/client/testing";
import { ErrorBoundary, OclifContext, ConfigContext } from "../NewCommand";

/*
  The ideal test wrapper should take an apollo.config.js output (the object exported),
  flags and arguments to the CLI (aka --key=service:foo:123), and mocks for requests to
  both local servers or graph manager

  It should use the same ErrorBoundary from the actual command implemenation so that we have
  consistent error handling.

  The goal is to test *individual commands*, not our command setup / parsing / filesystem loading of the config

  This wrapper should be a shared utility that lets you write tests like so:

  const CLI = (
    <Test flags={{}} args={[]} config={{}} mocks={[]}>
      <Command />
    </Test>
  );

  // initial loading state after the config is loaded
  const { rerender, lastFrame } = render(CLI);

  expect(stripAnsi(lastFrame())).toMatchInlineSnapshot()

  // wait for Apollo Client to "respond" which is asnyc because that is reality when running
  // the command
  wait(0)

  // test response from GM // Server // whatever the next async tick would look like
  rerender(CLI);

  // this should be the final output if only one async action is done, if not, use `wait` again and rerender, etc
  expect(stripAnsi(lastFrame())).toMatchInlineSnapshot()


*/

export const executeCommand = (Command, { config, args, flags, mocks }) => {
  const Component = new Command().render;
  const App = (
    <ErrorBoundary>
      <OclifContext.Provider value={{ flags, args }}>
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
