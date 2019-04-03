import {
  formatHumanReadable,
  formatMarkdown,
  formatTimePeriod
} from "../check";
import checkSchemaResult from "./fixtures/check-schema-result.json";
import { ChangeType } from "apollo-language-server/lib/graphqlTypes";
import chalk from "chalk";

describe("service:check", () => {
  let originalChalkEnabled;

  beforeEach(() => {
    originalChalkEnabled = chalk.enabled;
    chalk.enabled = false;
  });

  afterEach(() => {
    chalk.enabled = originalChalkEnabled;
  });

  describe("markdown formatting", () => {
    it("is correct with breaking changes", () => {
      expect(
        formatMarkdown({
          serviceName: "engine",
          tag: "staging",
          checkSchemaResult
        })
      ).toMatchInlineSnapshot(`
"
### Apollo Service Check
🔄 Validated your local schema against schema tag 'staging' on service 'engine'.
🔢 Compared **18 schema changes** against **100 operations** seen over the **last 24 hours**.
❌ Found **7 breaking changes** that would affect **3 operations** across **2 clients**

🔗 [View your service check details](https://engine-dev.apollographql.com/service/engine/checks?schemaTag=Detached%3A%20d664f715645c5f0bb5ad4f2260cd6cb8d19bbc68&schemaTagId=f9f68e7e-1b5f-4eab-a3da-1fd8cd681111&from=2019-03-26T22%3A25%3A12.887Z).
"
`);
      // Check when all the values are singluar
      expect(
        formatMarkdown({
          serviceName: "engine",
          tag: "staging",
          checkSchemaResult: {
            ...checkSchemaResult,
            diffToPrevious: {
              ...checkSchemaResult.diffToPrevious,
              affectedQueries: [
                checkSchemaResult.diffToPrevious.affectedQueries[0]
              ],
              changes: [
                checkSchemaResult.diffToPrevious.changes.find(
                  change => change.type === ChangeType.FAILURE
                )
              ]
            }
          }
        })
      ).toMatchInlineSnapshot(`
"
### Apollo Service Check
🔄 Validated your local schema against schema tag 'staging' on service 'engine'.
🔢 Compared **1 schema change** against operations seen over the **last 24 hours**.
❌ Found **1 breaking change** that would affect **1 operation**

🔗 [View your service check details](https://engine-dev.apollographql.com/service/engine/checks?schemaTag=Detached%3A%20d664f715645c5f0bb5ad4f2260cd6cb8d19bbc68&schemaTagId=f9f68e7e-1b5f-4eab-a3da-1fd8cd681111&from=2019-03-26T22%3A25%3A12.887Z).
"
`);
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
              type: ChangeType.NOTICE,
              affectedQueries: [],
              changes: []
            }
          }
        })
      ).toMatchInlineSnapshot(`
"
### Apollo Service Check
🔄 Validated your local schema against schema tag 'staging' on service 'engine'.
🔢 Compared **0 schema changes** against **100 operations** seen over the **last 24 hours**.
✅ Found **no breaking changes**.

🔗 [View your service check details](https://engine-dev.apollographql.com/service/engine/checks?schemaTag=Detached%3A%20d664f715645c5f0bb5ad4f2260cd6cb8d19bbc68&schemaTagId=f9f68e7e-1b5f-4eab-a3da-1fd8cd681111&from=2019-03-26T22%3A25%3A12.887Z).
"
`);
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
      ).toMatchInlineSnapshot(`
"
PASS    ARG_REMOVED                \`ServiceMutation.registerOperations\` arg \`manifestVersion\` was removed
PASS    ARG_REMOVED                \`ServiceMutation.uploadSchema\` arg \`historicParameters\` was removed
PASS    FIELD_ADDED                \`Service.schemaNotificationChannels\` was added
PASS    FIELD_ADDED                \`ServiceMutation.deregisterSchemaNotificationChannel\` was added
PASS    FIELD_ADDED                \`ServiceMutation.registerSchemaNotificationChannel\` was added
PASS    FIELD_DEPRECATION_REMOVED  \`AffectedClient.clientId\` is no longer deprecated
PASS    FIELD_DEPRECATION_REMOVED  \`Change.description\` is no longer deprecated
PASS    FIELD_REMOVED              \`AffectedClient.clientReferenceId\` was removed
PASS    FIELD_REMOVED              \`Change.affectedClientIdVersionPairs\` was removed
PASS    FIELD_REMOVED              \`Change.affectedClientReferenceIds\` was removed
PASS    FIELD_REMOVED              \`SchemaDiff.numberOfCheckedOperations\` was removed

FAIL    ARG_REMOVED                \`ServiceMutation.uploadSchema\` arg \`gitContext\` was removed
FAIL    ARG_REMOVED                \`ServiceMutation.uploadSchema\` arg \`schema\` was removed
FAIL    ARG_REMOVED                \`ServiceMutation.uploadSchema\` arg \`tag\` was removed
FAIL    FIELD_CHANGED_TYPE         \`Change.argNode\` changed type from \`NamedIntrospectionArg\` to \`NamedIntrospectionValue\`
FAIL    FIELD_REMOVED              \`Change.affectedClients\` was removed
FAIL    FIELD_REMOVED              \`NamedIntrospectionValue.printedType\` was removed
FAIL    TYPE_REMOVED               \`NamedIntrospectionArg\` removed

View full details at: https://engine-dev.apollographql.com/service/engine/checks?schemaTag=Detached%3A%20d664f715645c5f0bb5ad4f2260cd6cb8d19bbc68&schemaTagId=f9f68e7e-1b5f-4eab-a3da-1fd8cd681111&from=2019-03-26T22%3A25%3A12.887Z"
`);
    });

    it("should have correct output with only non-breaking changes", () => {
      expect(
        formatHumanReadable({
          checkSchemaResult: {
            ...checkSchemaResult,
            diffToPrevious: {
              ...checkSchemaResult.diffToPrevious,
              type: ChangeType.NOTICE,
              affectedQueries: [],
              changes: []
            }
          }
        })
      ).toMatchInlineSnapshot(`
"
No changes present between schemas

View full details at: https://engine-dev.apollographql.com/service/engine/checks?schemaTag=Detached%3A%20d664f715645c5f0bb5ad4f2260cd6cb8d19bbc68&schemaTagId=f9f68e7e-1b5f-4eab-a3da-1fd8cd681111&from=2019-03-26T22%3A25%3A12.887Z"
`);
    });

    it("should have correct output with only breaking changes", () => {
      expect(
        formatHumanReadable({
          checkSchemaResult: {
            ...checkSchemaResult,
            diffToPrevious: {
              ...checkSchemaResult.diffToPrevious,
              type: ChangeType.NOTICE,
              affectedQueries: [],
              changes: checkSchemaResult.diffToPrevious.changes.filter(
                change => change.type === ChangeType.FAILURE
              )
            }
          }
        })
      ).toMatchInlineSnapshot(`
"
FAIL    ARG_REMOVED         \`ServiceMutation.uploadSchema\` arg \`gitContext\` was removed
FAIL    ARG_REMOVED         \`ServiceMutation.uploadSchema\` arg \`schema\` was removed
FAIL    ARG_REMOVED         \`ServiceMutation.uploadSchema\` arg \`tag\` was removed
FAIL    FIELD_CHANGED_TYPE  \`Change.argNode\` changed type from \`NamedIntrospectionArg\` to \`NamedIntrospectionValue\`
FAIL    FIELD_REMOVED       \`Change.affectedClients\` was removed
FAIL    FIELD_REMOVED       \`NamedIntrospectionValue.printedType\` was removed
FAIL    TYPE_REMOVED        \`NamedIntrospectionArg\` removed

View full details at: https://engine-dev.apollographql.com/service/engine/checks?schemaTag=Detached%3A%20d664f715645c5f0bb5ad4f2260cd6cb8d19bbc68&schemaTagId=f9f68e7e-1b5f-4eab-a3da-1fd8cd681111&from=2019-03-26T22%3A25%3A12.887Z"
`);
    });
  });
});

//TODO: Turn these tests back on
// jest.mock("apollo-codegen-core/lib/localfs", () => {
//   return require("../../../__mocks__/localfs");
// });

// // this is because of herkou-cli-utils hacky mocking system on their console logger
// import { stdout, mockConsole } from "heroku-cli-util";
// import path from "path";
// import fs from "fs";
// import { test as setup } from "apollo-cli-test";
// import { introspectionQuery, print, execute, buildSchema } from "graphql";
// import gql from "graphql-tag";
// import { ENGINE_URI } from "../../../engine";
// import { VALIDATE_SCHEMA } from "../../../operations/validateSchema";

// import { vol, fs as mockFS } from "apollo-codegen-core/lib/localfs";

// const test = setup.do(() => mockConsole());
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
//                   type: "NOTICE",
//                   code: "DEPRECATION_ADDED",
//                   description: "Field `User.lastName` was deprecated"
//                 },
//                 {
//                   type: "WARNING",
//                   code: "FIELD_REMOVED",
//                   description: "Field `User.firstName` removed"
//                 },
//                 {
//                   type: "FAILURE",
//                   code: "ARG_CHANGE_TYPE",
//                   description: "Argument id on `Query.user` changed to ID!"
//                 },
//                 {
//                   type: "NOTICE",
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
//       expect(stdout).toContain('"type": "FAILURE"');
//     });
// });

// describe("error handling", () => {
//   test
//     .command(["schema:check"])
//     .catch(err => expect(err.message).toMatch(/No API key/))
//     .it("errors with no service API key");
// });
