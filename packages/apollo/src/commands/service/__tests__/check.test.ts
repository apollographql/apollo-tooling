import ServiceCheck, {
  formatHumanReadable,
  formatMarkdown,
  formatTimePeriod
} from "../check";
import checkSchemaResult from "../../../../__fixtures__/check-schema-result";
import { ChangeSeverity } from "apollo-language-server/lib/graphqlTypes";
import chalk from "chalk";
import nock = require("nock");
import { stdout, stderr } from "stdout-stderr";
import * as graphql from "graphql";

/**
 * Single URL for all local requests to be mocked
 */
const localURL = "http://localhost:4000";

let mockedConsoleLogOriginal: Console["log"] | null = null;
let mockedConsoleLogValues: string[] | null = null;

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
 * Convert a schema SDL to an introspection query result.
 *
 * @see https://blog.apollographql.com/three-ways-to-represent-your-graphql-schema-a41f4175100d
 *
 * @param schemaSdl string Schema in SDL form
 */
function sdlToIntrospectionQueryResult(schemaSdl: string) {
  return graphql.graphqlSync(
    graphql.buildSchema(schemaSdl),
    graphql.introspectionQuery
  ).data;
}

/**
 * Use `nock` to mock an `IntrospectionQuery`
 *
 * @param url string Root of the URL to mock; `/graphql` will automatically be appended
 * @param sdl SDL of the schema to mock
 */
function mockIntrospectionQuery(sdl: string) {
  nock(localURL, { encodedQueryParams: true })
    .post("/graphql", request => request.operationName === "IntrospectionQuery")
    .reply(200, {
      data: sdlToIntrospectionQueryResult(sdl)
    });
}

/**
 * Mock network requests for a non-federated schema check that produces errors.
 */
function mockNonFederatedFailure() {
  const sdl = `
    directive @cacheControl(maxAge: Int, scope: CacheControlScope) on FIELD_DEFINITION | OBJECT | INTERFACE

    enum CacheControlScope {
      PUBLIC
      PRIVATE
    }

    type Launch {
      id: ID!
      site: String
      mission: Mission
      rocket: Rocket
      isBooked: Boolean!
    }

    """
    Simple wrapper around our list of launches that contains a cursor to the
    last item in the list. Pass this cursor to the launches query to fetch results
    after these.
    """
    type LaunchConnection {
      cursor: String!
      hasMore: Boolean!
      launches: [Launch]!
    }

    type Mission {
      name: String
      missionPatch(size: PatchSize): String
    }

    type Mutation {
      bookTrips(launchIds: [ID]!): TripUpdateResponse!
      cancelTrip(launchId: ID!): TripUpdateResponse!
      login(email: String): String
    }

    enum PatchSize {
      SMALL
      LARGE
    }

    type Query {
      launches(
        """The number of results to show. Must be >= 1. Default = 20"""
        pageSize: Int

        """
        If you add a cursor here, it will only return results _after_ this cursor
        """
        after: String!
      ): LaunchConnection!
      launch(id: ID!): Launch
      me: User
    }

    type Rocket {
      id: ID!
      name: String
      type: String
    }

    type TripUpdateResponse {
      success: Boolean!
      message: String
      launches: [Launch]
    }

    """
    The \`Upload\` scalar type represents a file upload promise that resolves an
    object containing \`stream\`, \`filename\`, \`mimetype\` and \`encoding\`.
    """
    scalar Upload

    type User {
      id: ID!
      email: String!
      trips: [Launch]!
    }
  `;

  mockIntrospectionQuery(sdl);

  nock("https://engine-staging-graphql.apollographql.com:443", {
    encodedQueryParams: true
  })
    .post("/api/graphql", () => true)
    .reply(200, {
      data: {
        service: {
          checkSchema: {
            targetUrl:
              "https://engine-staging.apollographql.com/service/justin-fullstack-tutorial/check/3acd7765-61b2-4f1a-9227-8b288e42bfdc",
            diffToPrevious: {
              severity: "FAILURE",
              affectedClients: [],
              affectedQueries: [],
              numberOfCheckedOperations: 0,
              changes: [
                {
                  severity: "FAILURE",
                  code: "ARG_CHANGED_TYPE",
                  description:
                    "`Query.launches` argument `after` has changed type from `String` to `String!`"
                }
              ],
              validationConfig: {
                from: "-47347200",
                to: "-0",
                queryCountThreshold: 1,
                queryCountThresholdPercentage: 0
              }
            }
          }
        }
      }
    });
}

/**
 * Mock network requests for a non-federated schema check that produces no errors.
 */
function mockNonFederatedSuccess() {
  const sdl = `
    directive @cacheControl(maxAge: Int, scope: CacheControlScope) on FIELD_DEFINITION | OBJECT | INTERFACE

    enum CacheControlScope {
      PUBLIC
      PRIVATE
    }

    type Launch {
      id: ID!
      site: String
      mission: Mission
      rocket: Rocket
      isBooked: Boolean!
    }

    """
    Simple wrapper around our list of launches that contains a cursor to the
    last item in the list. Pass this cursor to the launches query to fetch results
    after these.
    """
    type LaunchConnection {
      cursor: String!
      hasMore: Boolean!
      launches: [Launch]!
    }

    type Mission {
      name: String
      missionPatch(size: PatchSize): String
    }

    type Mutation {
      bookTrips(launchIds: [ID]!): TripUpdateResponse!
      cancelTrip(launchId: ID!): TripUpdateResponse!
      login(email: String): String
    }

    enum PatchSize {
      SMALL
      LARGE
    }

    type Query {
      launches(
        """The number of results to show. Must be >= 1. Default = 20"""
        pageSize: Int

        """
        If you add a cursor here, it will only return results _after_ this cursor
        """
        after: String!
      ): LaunchConnection!
      launch(id: ID!): Launch
      me: User
    }

    type Rocket {
      id: ID!
      name: String
      type: String
    }

    type TripUpdateResponse {
      success: Boolean!
      message: String
      launches: [Launch]
    }

    """
    The \`Upload\` scalar type represents a file upload promise that resolves an
    object containing \`stream\`, \`filename\`, \`mimetype\` and \`encoding\`.
    """
    scalar Upload

    type User {
      id: ID!
      email: String!
      trips: [Launch]!
    }
  `;

  mockIntrospectionQuery(sdl);

  nock("https://engine-staging-graphql.apollographql.com:443", {
    encodedQueryParams: true
  })
    .post("/api/graphql", () => true)
    .reply(200, {
      data: {
        service: {
          checkSchema: {
            targetUrl:
              "https://engine-staging.apollographql.com/service/justin-fullstack-tutorial/check/3acd7765-61b2-4f1a-9227-8b288e42bfdc",
            diffToPrevious: {
              severity: "NOTICE",
              affectedClients: [],
              affectedQueries: [],
              numberOfCheckedOperations: 0,
              changes: [
                {
                  severity: "NOTICE",
                  code: "ARG_CHANGED_TYPE",
                  description:
                    "`Query.launches` argument `after` has changed type from `String` to `String!`"
                }
              ],
              validationConfig: {
                from: "-47347200",
                to: "-0",
                queryCountThreshold: 1,
                queryCountThresholdPercentage: 0
              }
            }
          }
        }
      }
    });
}

describe("service:check", () => {
  let originalChalkEnabled;

  beforeEach(() => {
    originalChalkEnabled = chalk.enabled;
    chalk.enabled = false;

    // Clean console log capturing before tests in the event that `afterEach` was not run successfully.
    uncaptureApplicationOutput();

    // Clean up all network mocks before tests in the event that `afterEach` was not run successfully.
    nock.cleanAll();
  });

  afterEach(() => {
    chalk.enabled = originalChalkEnabled;

    // Clean up console log mocking
    uncaptureApplicationOutput();

    // Clean up all network mocks
    nock.cleanAll();
  });

  // These are integration tests and not e2e tests because these don't actually hit the remote server.
  describe("integration", () => {
    describe("non-federated", () => {
      describe("should report traffic errors correctly", () => {
        it("vanilla", async () => {
          captureApplicationOutput();
          mockNonFederatedFailure();
          expect.assertions(2);

          await expect(ServiceCheck.run([])).rejects.toThrow();

          // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
          expect(uncaptureApplicationOutput()).toMatchSnapshot();
        });

        it("--markdown", async () => {
          captureApplicationOutput();
          mockNonFederatedFailure();
          expect.assertions(2);

          // markdown formatted output should not throw
          await expect(ServiceCheck.run(["--markdown"])).resolves.not.toThrow();

          // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
          expect(uncaptureApplicationOutput()).toMatchSnapshot();
        });

        it("--json", async () => {
          captureApplicationOutput();
          mockNonFederatedFailure();
          expect.assertions(2);

          // JSON formatted output should not throw
          await expect(ServiceCheck.run(["--json"])).resolves.not.toThrow();

          // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
          expect(uncaptureApplicationOutput()).toMatchSnapshot();
        });
      });

      describe("should report traffic non-errors correctly", () => {
        it("vanilla", async () => {
          captureApplicationOutput();
          mockNonFederatedSuccess();
          expect.assertions(2);

          await expect(ServiceCheck.run([])).resolves.not.toThrow();

          // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
          expect(uncaptureApplicationOutput()).toMatchSnapshot();
        });

        it("--markdown", async () => {
          captureApplicationOutput();
          mockNonFederatedSuccess();
          expect.assertions(2);

          await expect(ServiceCheck.run(["--markdown"])).resolves.not.toThrow();

          // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
          expect(uncaptureApplicationOutput()).toMatchSnapshot();
        });

        it("--json", async () => {
          captureApplicationOutput();
          mockNonFederatedSuccess();
          expect.assertions(2);

          await expect(ServiceCheck.run(["--json"])).resolves.not.toThrow();

          // Inline snapshots don't work here due to https://github.com/facebook/jest/issues/6744.
          expect(uncaptureApplicationOutput()).toMatchSnapshot();
        });
      });
    });
  });

  describe("markdown formatting", () => {
    it("is correct with breaking changes", () => {
      expect(
        formatMarkdown({
          serviceName: "engine",
          tag: "staging",
          checkSchemaResult
        })
      ).toMatchSnapshot();
      // Check when all the values are singluar
      expect(
        formatMarkdown({
          serviceName: "engine",
          tag: "staging",
          checkSchemaResult: {
            ...checkSchemaResult,
            diffToPrevious: {
              ...checkSchemaResult.diffToPrevious,
              affectedClients: [
                checkSchemaResult.diffToPrevious.affectedClients[0]
              ],
              affectedQueries: [
                checkSchemaResult.diffToPrevious.affectedQueries[0]
              ],
              changes: [
                checkSchemaResult.diffToPrevious.changes.find(
                  change => change.severity === ChangeSeverity.FAILURE
                )
              ],
              numberOfCheckedOperations: 1
            }
          }
        })
      ).toMatchSnapshot();
    });

    it("is correct with no breaking changes", () => {
      expect(
        formatMarkdown({
          serviceName: "engine",
          tag: "staging",
          checkSchemaResult: {
            ...checkSchemaResult,
            diffToPrevious: {
              ...checkSchemaResult.diffToPrevious,
              severity: ChangeSeverity.NOTICE,
              affectedClients: [],
              affectedQueries: [],
              changes: []
            }
          }
        })
      ).toMatchSnapshot();
    });
  });

  describe("formatTimePeriod", () => {
    it("should show current result for 1 hour", () => {
      expect(formatTimePeriod(1)).toMatchInlineSnapshot(`"1 hour"`);
    });

    it("should show current result for 12 hours", () => {
      expect(formatTimePeriod(12)).toMatchInlineSnapshot(`"12 hours"`);
    });

    it("should show current result for 24 hours", () => {
      expect(formatTimePeriod(24)).toMatchInlineSnapshot(`"24 hours"`);
    });

    it("should show current result for 36 hours", () => {
      expect(formatTimePeriod(36)).toMatchInlineSnapshot(`"1 day"`);
    });

    it("should show current result for 48 hours", () => {
      expect(formatTimePeriod(48)).toMatchInlineSnapshot(`"2 days"`);
    });
  });

  describe("formatHumanReadable", () => {
    it("should have correct output with breaking and non-breaking changes", () => {
      expect(
        formatHumanReadable({
          checkSchemaResult
        })
      ).toMatchSnapshot();
    });

    it("should have correct output with only non-breaking changes", () => {
      expect(
        formatHumanReadable({
          checkSchemaResult: {
            ...checkSchemaResult,
            diffToPrevious: {
              ...checkSchemaResult.diffToPrevious,
              severity: ChangeSeverity.NOTICE,
              affectedQueries: [],
              changes: []
            }
          }
        })
      ).toMatchSnapshot();
    });

    it("should have correct output with only breaking changes", () => {
      expect(
        formatHumanReadable({
          checkSchemaResult: {
            ...checkSchemaResult,
            diffToPrevious: {
              ...checkSchemaResult.diffToPrevious,
              severity: ChangeSeverity.NOTICE,
              affectedQueries: [],
              changes: checkSchemaResult.diffToPrevious.changes.filter(
                change => change.severity === ChangeSeverity.FAILURE
              )
            }
          }
        })
      ).toMatchSnapshot();
    });
  });
});

//TODO: Turn these tests back on
// jest.mock("apollo-codegen-core/lib/localfs", () => {
//   return require("../../../__mocks__/localfs");
// });

// // this is because of herkou-cli-utils hacky mocking system on their console logger
// import { stdout, captureApplicationOutput } from "heroku-cli-util";
// import path from "path";
// import fs from "fs";
// import { test as setup } from "apollo-cli-test";
// import { introspectionQuery, print, execute, buildSchema } from "graphql";
// import gql from "graphql-tag";
// import { ENGINE_URI } from "../../../engine";
// import { VALIDATE_SCHEMA } from "../../../operations/validateSchema";

// import { vol, fs as mockFS } from "apollo-codegen-core/lib/localfs";

// const test = setup.do(() => captureApplicationOutput());
// const ENGINE_API_KEY = "service:test:1234";
// const hash = "12345";
// const schemaContents = fs.readFileSync(
//   path.resolve(__dirname, "./fixtures/schema.graphql"),
//   {
//     encoding: "utf-8"
//   }
// );

// const fullSchema = execute(buildSchema(schemaContents), gql(introspectionQuery))
//   .data;

// const localSuccess = nock => {
//   nock
//     .post("/graphql", {
//       query: print(gql(introspectionQuery)),
//       operationName: "IntrospectionQuery",
//       variables: {}
//     })
//     .reply(200, { data: fullSchema });
// };

// const engineSuccess = ({ schema, tag, results } = {}) => nock => {
//   nock
//     .matchHeader("x-api-key", ENGINE_API_KEY)
//     .post("/", {
//       operationName: "CheckSchema",
//       variables: {
//         id: "test",
//         schema: schema || fullSchema.__schema,
//         tag: tag || "current",
//         gitContext: {
//           commit: /.+/i,
//           remoteUrl: /apollo-tooling/i,
//           committer: /@/i
//         }
//       },
//       query: print(VALIDATE_SCHEMA)
//     })
//     .reply(200, {
//       data: {
//         service: {
//           schema: {
//             checkSchema: {
//               changes: results || [
//                 {
//                   severity: "NOTICE",
//                   code: "DEPRECATION_ADDED",
//                   description: "Field `User.lastName` was deprecated"
//                 },
//                 {
//                   severity: "WARNING",
//                   code: "FIELD_REMOVED",
//                   description: "Field `User.firstName` removed"
//                 },
//                 {
//                   severity: "FAILURE",
//                   code: "ARG_CHANGE_TYPE",
//                   description: "Argument id on `Query.user` changed to ID!"
//                 },
//                 {
//                   severity: "NOTICE",
//                   code: "FIELD_ADDED",
//                   description: "Field `User.fullName` was added"
//                 }
//               ]
//             }
//           }
//         }
//       }
//     });
// };

// jest.setTimeout(25000);

// beforeEach(() => {
//   vol.reset();
//   vol.fromJSON({
//     __blankFileSoDirectoryExists: ""
//   });
// });

// describe("successful checks", () => {
//   test
//     .nock("http://localhost:4000", localSuccess)
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ ENGINE_API_KEY })
//     .stdout()
//     .command(["schema:check"])
//     .exit(1)
//     .it("compares against the latest uploaded schema", () => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("NOTICE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .nock("http://localhost:4000", localSuccess)
//     .nock(ENGINE_URI, engineSuccess())
//     .stdout()
//     .command(["schema:check", `--key=${ENGINE_API_KEY}`])
//     .exit(1)
//     .it("allows custom api key", () => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("NOTICE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .nock("http://localhost:4000", localSuccess)
//     .nock(ENGINE_URI, engineSuccess({ results: [] }))
//     .env({ ENGINE_API_KEY })
//     .stdout()
//     .command(["schema:check"])
//     .it(
//       "compares against the latest uploaded schema with no change",
//       ({ stdout }) => {
//         expect(stdout).toContain("No changes");
//       }
//     );

//   test
//     .stdout()
//     .nock("https://staging.example.com", localSuccess)
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ ENGINE_API_KEY })
//     .command(["schema:check", "--endpoint=https://staging.example.com/graphql"])
//     .exit(1)
//     .it("compares against a schema from a custom remote", () => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("NOTICE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .stdout()
//     .nock("http://localhost:4000", localSuccess)
//     .nock(
//       "https://engine.example.com",
//       engineSuccess({ engine: "https://engine.example.com" })
//     )
//     .env({ ENGINE_API_KEY })
//     .command(["schema:check", "--engine=https://engine.example.com"])
//     .exit(1)
//     .it("compares against a schema from a custom registry", std => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("NOTICE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .stdout()
//     .nock("https://staging.example.com", nock => {
//       nock
//         .matchHeader("Authorization", "1234")
//         .matchHeader("Hello", "World")
//         .post("/graphql", {
//           query: print(gql(introspectionQuery)),
//           operationName: "IntrospectionQuery",
//           variables: {}
//         })
//         .reply(200, { data: fullSchema });
//     })
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ ENGINE_API_KEY })
//     .command([
//       "schema:check",
//       "--endpoint=https://staging.example.com/graphql",
//       "--header=Authorization: 1234",
//       "--header=Hello: World"
//     ])
//     .exit(1)
//     .it(
//       "calls engine with a schema from a custom remote with custom headers",
//       () => {
//         expect(stdout).toContain("FAILURE");
//         expect(stdout).toContain("NOTICE");
//         expect(stdout).toContain("WARNING");
//       }
//     );

//   test
//     .do(() =>
//       vol.fromJSON({
//         "introspection-result.json": JSON.stringify({ data: fullSchema })
//       })
//     )
//     .stdout()
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ ENGINE_API_KEY })
//     .command(["schema:check", "--endpoint=introspection-result.json"])
//     .exit(1)
//     .it(
//       "calls engine with a schema from an introspection result on the filesystem",
//       () => {
//         expect(stdout).toContain("FAILURE");
//         expect(stdout).toContain("NOTICE");
//         expect(stdout).toContain("WARNING");
//       }
//     );

//   test
//     .do(() =>
//       vol.fromJSON({
//         "schema.graphql": schemaContents
//       })
//     )
//     .stdout()
//     .nock(ENGINE_URI, engineSuccess({ schema: fullSchema.__schema }))
//     .env({ ENGINE_API_KEY })
//     .command(["schema:check", "--endpoint=schema.graphql"])
//     .exit(1)
//     .it(
//       "calls engine with a schema from a schema file on the filesystem",
//       () => {
//         expect(stdout).toContain("FAILURE");
//         expect(stdout).toContain("NOTICE");
//         expect(stdout).toContain("WARNING");
//       }
//     );

//   test
//     .nock("http://localhost:4000", localSuccess)
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ ENGINE_API_KEY })
//     .stdout()
//     .command(["schema:check", "--json"])
//     .exit(1)
//     .it("allows formatting success as JSON", () => {
//       expect(stdout).toContain('"severity": "FAILURE"');
//     });
// });

// describe("error handling", () => {
//   test
//     .command(["schema:check"])
//     .catch(err => expect(err.message).toMatch(/No API key/))
//     .it("errors with no service API key");
// });
