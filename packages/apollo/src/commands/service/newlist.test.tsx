import React from "react";

import ServiceList, { LIST_SERVICES } from "./newlist";
import { executeCommand } from "../../utils/command-test-utils";

const mocks = {
  federatedSuccess: [
    {
      request: {
        query: LIST_SERVICES,
        variables: {
          id: "hello",
          graphVariant: "wow"
        }
      },
      result: {
        data: {
          service: {
            implementingServices: {
              services: [
                {
                  graphID: "hello",
                  graphVariant: "wow",
                  updatedAt: "2019-05-16T21:34:29.245Z",
                  __typename: "FederatedImplementingService",
                  name: "reviews",
                  url: "http://localhost:4004/graphql"
                },
                {
                  graphID: "hello",
                  graphVariant: "wow",
                  updatedAt: "2019-05-16T19:22:16.939Z",
                  __typename: "FederatedImplementingService",
                  name: "inventory",
                  url: "http://localhost:4002/graphql"
                },
                {
                  graphID: "hello",
                  graphVariant: "wow",
                  updatedAt: "2019-05-13T14:56:04.172Z",
                  __typename: "FederatedImplementingService",
                  name: "accounts",
                  url: "http://localhost:4001/graphql"
                },
                {
                  graphID: "hello",
                  graphVariant: "wow",
                  updatedAt: "2019-05-16T19:21:10.243Z",
                  __typename: "FederatedImplementingService",
                  name: "products",
                  url: "http://localhost:4003/graphql"
                }
              ],
              __typename: "FederatedImplementingServices"
            }
          }
        }
      }
    }
  ],
  federatedFailure: [
    {
      request: {
        query: LIST_SERVICES,
        variables: {
          id: "hello",
          graphVariant: "wow"
        }
      },
      error: new Error("something bad happened")
    }
  ],
  nonFederated: [
    {
      request: {
        query: LIST_SERVICES,
        variables: {
          id: "hello",
          graphVariant: "wow"
        }
      },
      result: {
        data: {
          service: {
            implementingServices: {
              services: [],
              __typename: "NonFederatedImplementingService"
            }
          }
        }
      }
    }
  ]
};

describe("service:list", () => {
  it("succeeds with a federated graph", async () => {
    const { lastFrame, frames, rerender } = executeCommand(ServiceList, {
      config: {
        name: "hello",
        engine: { frontend: "https://engine.apollographql.com" }
      },
      flags: { tag: "wow", key: "service:hello:2345824930" },
      mocks: mocks.federatedSuccess
    });

    // first loading state
    expect(lastFrame()).toMatchInlineSnapshot(
      `"⠋ Fetching list of services for graph hello@wow"`
    );

    // final state
    await rerender(0);
    expect(lastFrame()).toMatchInlineSnapshot(`
      "
      ┌───────────┬───────────────────────────────┬───────────────────────────┐
      │ Name      │ URL                           │ Last Updated              │
      ├───────────┼───────────────────────────────┼───────────────────────────┤
      │ accounts  │ http://localhost:4001/graphql │ 13 May 2019 (a month ago) │
      ├───────────┼───────────────────────────────┼───────────────────────────┤
      │ inventory │ http://localhost:4002/graphql │ 16 May 2019 (a month ago) │
      ├───────────┼───────────────────────────────┼───────────────────────────┤
      │ products  │ http://localhost:4003/graphql │ 16 May 2019 (a month ago) │
      ├───────────┼───────────────────────────────┼───────────────────────────┤
      │ reviews   │ http://localhost:4004/graphql │ 16 May 2019 (a month ago) │
      └───────────┴───────────────────────────────┴───────────────────────────┘

      View full details at: https://engine.apollographql.com/graph/hello/service-list"
    `);
  });

  it("fails with a federated graph", async () => {
    // silence the console
    const consoleError = console.error;
    console.error = jest.fn();

    const { lastFrame, frames, rerender } = executeCommand(ServiceList, {
      config: {
        name: "hello",
        engine: { frontend: "https://engine.apollographql.com" }
      },
      flags: { tag: "wow", key: "service:hello:2345824930" },
      mocks: mocks.federatedFailure
    });

    // first loading state
    expect(lastFrame()).toMatchInlineSnapshot(
      `"⠋ Fetching list of services for graph hello@wow"`
    );

    // final state
    await rerender(0);
    expect(lastFrame()).toMatchInlineSnapshot(
      `"An error occurred: Network error: something bad happened"`
    );

    // fix the console back to normal
    console.error = consoleError;
  });

  it("should display non federated message for a non federated service", async () => {
    const { lastFrame, frames, rerender } = executeCommand(ServiceList, {
      config: {
        name: "hello",
        engine: { frontend: "https://engine.apollographql.com" }
      },
      flags: { tag: "wow", key: "service:hello:2345824930" },
      mocks: mocks.nonFederated
    });

    // first loading state
    expect(lastFrame()).toMatchInlineSnapshot(
      `"⠋ Fetching list of services for graph hello@wow"`
    );

    // final state
    await rerender(0);
    expect(lastFrame()).toMatchInlineSnapshot(`
      "
      This graph is not federated. There are no services composing the graph
      View full details at: https://engine.apollographql.com/graph/hello/service-list"
    `);
  });
});
