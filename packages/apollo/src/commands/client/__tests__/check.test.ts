it("is turned on after summit", () => {});

// jest.mock("apollo-codegen-core/lib/localfs", () => {
//   return require("../../../__mocks__/localfs");
// });

// // this is because of herkou-cli-utils hacky mocking system on their console logger
// import { stdout, mockConsole } from "heroku-cli-util";
// import { test as setup } from "apollo-cli-test";
// import { print, parse } from "graphql";
// import { ENGINE_URI } from "../../../engine";
// import { VALIDATE_OPERATIONS } from "../../../operations/validateOperations";

// import { fs as mockFS, vol } from "apollo-codegen-core/lib/localfs";
// const test = setup.do(() => mockConsole());
// const APOLLO_KEY = "service:test:1234";
// const hash = "12345";

// const dummyOperations = [
//   { document: "{ me { firstname } }" },
//   { document: "{ me { lastName } }" }
// ].map(({ document, ...rest }) => ({
//   document: print(parse(document)),
//   ...rest
// }));

// const engineSuccess = ({ operations, tag, results } = {}) => nock => {
//   nock
//     .matchHeader("x-api-key", APOLLO_KEY)
//     .post("/", {
//       operationName: "CheckOperations",
//       variables: {
//         id: "test",
//         operations: operations || dummyOperations,
//         tag: tag || "current",
//         gitContext: {
//           commit: /.+/i,
//           // If you are still using apollo-codegen as your remote, you must
//           // change to apollo-cli for the tests to pass
//           remoteUrl: /apollo-tooling/i,
//           committer: /@/i
//         }
//       },
//       query: print(VALIDATE_OPERATIONS)
//     })
//     .reply(200, {
//       data: {
//         service: {
//           schema: {
//             checkOperations: results || [
//               {
//                 type: "WARNING",
//                 code: "DEPRECATED_FIELD",
//                 description: "Field `User.lastName` is deprecated"
//               },
//               {
//                 type: "FAILURE",
//                 code: "INVALID_OPERATION",
//                 description:
//                   'Cannont query field "firstname" on type User. Did you mean "firstName"?'
//               }
//             ]
//           }
//         }
//       }
//     });
// };

// jest.setTimeout(15000);

// beforeEach(() => {
//   vol.reset();
//   vol.fromJSON({
//     __blankFileSoDirectoryExists: ""
//   });
// });

// const files = dummyOperations
//   .map((query, i) => ({
//     [`query${i}.graphql`]: query.document
//   }))
//   .reduce((prev, current) => ({ ...prev, ...current }), {});

// describe("successful checks", () => {
//   test
//     .do(() => vol.fromJSON(files))
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ APOLLO_KEY })
//     .stdout()
//     .command(["queries:check"])
//     .exit(1)
//     .it("compares against the latest uploaded schema", () => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .do(() =>
//       vol.fromJSON({
//         ...files,
//         "package.json": `
//       {
//         "apollo": {
//           "schemas": {
//             "default": {
//               "engineKey": "${APOLLO_KEY}"
//             }
//           }
//         }
//       }
//       `
//       })
//     )
//     .nock(ENGINE_URI, engineSuccess())
//     .stdout()
//     .command(["queries:check"])
//     .exit(1)
//     .it(
//       "compares against the latest uploaded schema with engine key from default config",
//       () => {
//         expect(stdout).toContain("FAILURE");
//         expect(stdout).toContain("WARNING");
//       }
//     );

//   test
//     .do(() =>
//       vol.fromJSON({
//         ...files,
//         "test-package.json": `
//       {
//         "apollo": {
//           "schemas": {
//             "default": {
//               "engineKey": "${APOLLO_KEY}"
//             }
//           }
//         }
//       }
//       `
//       })
//     )
//     .nock(ENGINE_URI, engineSuccess())
//     .stdout()
//     .command(["queries:check", "--config=test-package.json"])
//     .exit(1)
//     .it(
//       "compares against the latest uploaded schema with engine key from specified config",
//       () => {
//         expect(stdout).toContain("FAILURE");
//         expect(stdout).toContain("WARNING");
//       }
//     );

//   test
//     .do(() => vol.fromJSON(files))
//     .nock(ENGINE_URI, engineSuccess())
//     .stdout()
//     .command(["queries:check", `--key=${APOLLO_KEY}`])
//     .exit(1)
//     .it("allows custom api key", () => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .do(() => vol.fromJSON(files))
//     .nock(ENGINE_URI, engineSuccess({ results: [] }))
//     .env({ APOLLO_KEY })
//     .stdout()
//     .command(["queries:check"])
//     .it(
//       "compares against the latest uploaded schema with no change",
//       ({ stdout }) => {
//         expect(stdout).toContain(
//           "No operations have issues with the current schema"
//         );
//       }
//     );

//   test
//     .do(() => {
//       const nested = {};
//       Object.keys(files).forEach(name => {
//         nested[`client/${name}`] = files[name];
//       });
//       vol.fromJSON(nested);
//     })
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ APOLLO_KEY })
//     .stdout()
//     .command(["queries:check", "--queries=./client/*.graphql"])
//     .exit(1)
//     .it("compares against a schema from a custom directory", () => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .stdout()
//     .do(() => vol.fromJSON(files))
//     .nock(
//       "https://engine.example.com",
//       engineSuccess({ engine: "https://engine.example.com" })
//     )
//     .env({ APOLLO_KEY })
//     .command(["queries:check", "--engine=https://engine.example.com"])
//     .exit(1)
//     .it("compares against a schema from a custom registry", std => {
//       expect(stdout).toContain("FAILURE");
//       expect(stdout).toContain("WARNING");
//     });

//   test
//     .do(() => vol.fromJSON(files))
//     .nock(ENGINE_URI, engineSuccess())
//     .env({ APOLLO_KEY })
//     .stdout()
//     .command(["queries:check", "--json"])
//     .exit(1)
//     .it("allows formatting success as JSON", () => {
//       expect(stdout).toContain('"type": "FAILURE"');
//     });
// });

// describe("error handling", () => {
//   test
//     .command(["queries:check"])
//     .catch(err => expect(err.message).toMatch(/No API key/))
//     .it("errors with no service API key");
// });
