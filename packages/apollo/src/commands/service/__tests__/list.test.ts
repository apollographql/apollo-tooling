import ServiceList from "../list";
import chalk from "chalk";
import { stdout } from "stdout-stderr";
import nock = require("nock");

const stagingAPI = "https://engine-staging-graphql.apollographql.com:443";

/**
 * Default API key. This is not an actual API key but a randomly generated string.
 *
 * If you need to use the `nock` recorder, then this will not work because we won't be able to access studio
 * with a fake API key.
 */
const fakeApiKey = "service:engine:9YC5AooMa2yO11eFlZat11";

/**
 * Apollo API key we're using.
 *
 * This is hard-coded to `fakeApiKey` because this is out day-to-day usage should be. If we're going to be
 * updating the mocked data; we'll need to use a real API key (see [README#Regenerating Mocked Network
 * Data](https://github.com/apollographql/apollo-tooling#regenerating-mocked-network-data)); which will be
 * placed here.
 */
const apiKey = fakeApiKey;

/**
 * An array that we'll spread into all CLI commands to pass the Apollo api key.
 */
const cliKeyParameter = [`--key=${apiKey}`];

/**
 * The original `console.log` being mocked.
 *
 * We save it so we can restore it after a test.
 */
let mockedConsoleLogOriginal: Console["log"] | null = null;

/**
 * Array of intercepted console values.
 */
let mockedConsoleLogValues: string[] | null = null;

// TODO: the following two functions are identical to the ones found in check.test.ts
// we are choosing to duplicate them for now, because with a shared helper function,
// jest overwrites console log output as the tests are run in parallel

/**
 * Mock and capture `console.log` and `stdout.write`s. Return them in that order as a single string.
 *
 * This will emulate what the output of running the CLI would look like.
 *
 * Call `uncaptureApplicationOutput` to reverse the effects of this function.
 */
function captureApplicationOutput() {
  mockedConsoleLogOriginal = console["log"];
  mockedConsoleLogValues = [];
  console["log"] = jest.fn((...items) => {
    if (!mockedConsoleLogValues) {
      throw new Error(
        "mockedConsoleLogValues is not prepared but we're still capturing console.log. This means there's a bug somewhere."
      );
    }

    mockedConsoleLogValues.push(items.join(" "));
  });

  stdout.start();
}

/**
 * Reverse mocking of `console.log` and `stdout.write`. If they weren't mocked to begin with, this will do
 * nothing and return null.
 */
function uncaptureApplicationOutput(): string | null {
  // These will be `null` if we haven't mocked `console.log`.
  if (!mockedConsoleLogOriginal || !mockedConsoleLogValues) {
    return null;
  }

  const result = mockedConsoleLogValues.concat(stdout.output).join("\n");
  mockedConsoleLogValues = null;

  // Restore `console.log`
  console["log"] = mockedConsoleLogOriginal;

  // Stop capturing `stdout`.
  stdout.stop();

  return result;
}

/**
 * Mock network requests for a successful service list of a federated graph.
 */
function mockServiceListFederated() {
  nock(stagingAPI, {
    encodedQueryParams: true,
  })
    .post(
      "/api/graphql",
      ({ operationName }) => operationName === "ListServices"
    )
    .reply(200, {
      data: {
        frontendUrlRoot: "https://engine-staging.apollographql.com",
        service: {
          implementingServices: {
            services: [
              {
                graphID: "maya-federation-demo",
                graphVariant: "current",
                updatedAt: "2019-05-16T21:34:29.245Z",
                __typename: "FederatedImplementingService",
                name: "reviews",
                url: "http://localhost:4004/graphql",
              },
              {
                graphID: "maya-federation-demo",
                graphVariant: "current",
                updatedAt: "2019-05-16T19:22:16.939Z",
                __typename: "FederatedImplementingService",
                name: "inventory",
                url: "http://localhost:4002/graphql",
              },
              {
                graphID: "maya-federation-demo",
                graphVariant: "current",
                updatedAt: "2019-05-13T14:56:04.172Z",
                __typename: "FederatedImplementingService",
                name: "accounts",
                url: "http://localhost:4001/graphql",
              },
              {
                graphID: "maya-federation-demo",
                graphVariant: "current",
                updatedAt: "2019-05-16T19:21:10.243Z",
                __typename: "FederatedImplementingService",
                name: "products",
                url: "http://localhost:4003/graphql",
              },
            ],
            __typename: "FederatedImplementingServices",
          },
        },
      },
    });
}

/**
 * Mock network requests for a successful service list of a nonfederated graph.
 */
function mockServiceListNonFederated() {
  nock(stagingAPI, {
    encodedQueryParams: true,
  })
    .post(
      "/api/graphql",
      ({ operationName }) => operationName === "ListServices"
    )
    .reply(200, {
      data: {
        frontendUrlRoot: "https://engine-staging.apollographql.com",
        service: {
          implementingServices: {
            services: [],
            __typename: "FederatedImplementingServices",
          },
        },
      },
    });
}

describe("service:list", () => {
  let originalChalkEnabled;

  beforeEach(() => {
    originalChalkEnabled = chalk.enabled;
    chalk.enabled = false;

    // Clean console log capturing before tests in the event that `afterEach` was not run successfully.
    uncaptureApplicationOutput();

    // Clean up all network mocks before tests in the event that `afterEach` was not run successfully.
    nock.cleanAll();

    nock.disableNetConnect();

    // Set the jest timeout to be longer than the default 5000ms to compensate for slow CI.
    jest.setTimeout(25000);
  });

  afterEach(() => {
    chalk.enabled = originalChalkEnabled;

    // Clean up console log mocking
    uncaptureApplicationOutput();

    // Clean up all network mocks and restore original functionality
    nock.cleanAll();
    nock.enableNetConnect();
  });
  describe("integration", () => {
    describe("should list services correctly for a federated service", () => {
      it("vanilla", async () => {
        captureApplicationOutput();
        mockServiceListFederated();

        expect.assertions(2);

        await expect(ServiceList.run(cliKeyParameter)).resolves.not.toThrow();

        // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
        expect(uncaptureApplicationOutput()).toMatchSnapshot();
      });
    });

    describe("should display non federated message for a non federated service", () => {
      it("vanilla", async () => {
        captureApplicationOutput();
        mockServiceListNonFederated();

        expect.assertions(2);

        await expect(ServiceList.run(cliKeyParameter)).resolves.not.toThrow();

        // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
        expect(uncaptureApplicationOutput()).toMatchSnapshot();
      });
    });
  });
});
