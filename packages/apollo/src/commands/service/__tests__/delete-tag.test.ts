import ServiceDeleteTag from "../delete-tag";
import chalk from "chalk";
import { stdout } from "stdout-stderr";
import nock = require("nock");

const stagingAPI = "https://engine-staging-graphql.apollographql.com:443";

/**
 * Default API key. This is not an actual API key but a randomly generated string.
 *
 * If you need to use the `nock` recorder, then this will not work because we won't be able to access engine
 * with a fake API key.
 */
const fakeApiKey = "service:engine:9YC5AooMa2yO11eFlZat11";

/**
 * Engine API key we're using.
 *
 * This is hard-coded to `fakeApiKey` because this is out day-to-day usage should be. If we're going to be
 * updating the mocked data; we'll need to use a real API key (see [README#Regenerating Mocked Network
 * Data](https://github.com/apollographql/apollo-tooling#regenerating-mocked-network-data)); which will be
 * placed here.
 */
const apiKey = fakeApiKey;

/**
 * An array that we'll spread into all CLI commands to pass the engine api key.
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
// and list.test.ts. We are choosing to duplicate them for now, because with a shared
// helper function, jest overwrites console log output as the tests are run in parallel

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
 * Mock network requests for a successful deletion.
 */
function mockDeletionSuccess() {
  nock(stagingAPI, {
    encodedQueryParams: true
  })
    .post(
      "/api/graphql",
      ({ operationName }) => operationName === "DeleteSchemaTag"
    )
    .reply(200, {
      data: {
        service: {
          deleteSchemaTag: {
            deleted: true
          }
        }
      }
    });
}

/**
 * Mock network requests for a failed deletion.
 */
function mockDeletionFailure() {
  nock(stagingAPI, {
    encodedQueryParams: true
  })
    .post(
      "/api/graphql",
      ({ operationName }) => operationName === "DeleteSchemaTag"
    )
    .reply(200, {
      data: {
        service: {
          deleteSchemaTag: {
            deleted: false
          }
        }
      }
    });
}

describe("service:remove-tag", () => {
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
    jest.setTimeout(15000);
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
    it("should successfully delete tag if exists", async () => {
      captureApplicationOutput();
      mockDeletionSuccess();

      expect.assertions(2);

      await expect(
        ServiceDeleteTag.run([...cliKeyParameter, "--tag=foo"])
      ).resolves.not.toThrow();

      // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
      expect(uncaptureApplicationOutput()).toMatchSnapshot();
    });

    it("should fail if tag does not exist", async () => {
      captureApplicationOutput();
      mockDeletionFailure();

      expect.assertions(2);

      await expect(
        ServiceDeleteTag.run([...cliKeyParameter, "--tag=bar"])
      ).rejects.toThrow();

      // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
      expect(uncaptureApplicationOutput()).toMatchSnapshot();
    });
  });
});
