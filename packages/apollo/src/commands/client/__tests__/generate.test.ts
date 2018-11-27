// this is because of herkou-cli-utils hacky mocking system on their console logger
import { stdout, mockConsole } from "heroku-cli-util";
import * as path from "path";
import * as fs from "fs";
import { test as setup } from "apollo-cli-test";
import {
  introspectionQuery,
  print,
  execute,
  buildSchema,
  graphql
} from "graphql";
import gql from "graphql-tag";

const test = setup.do(() => mockConsole());

// helper function to resolve files from the actual filesystem
const resolveFiles = opts => {
  let files = {};
  Object.keys(opts).map(key => {
    files[key] = fs.readFileSync(path.resolve(__dirname, opts[key]), {
      encoding: "utf-8"
    });
  });

  return files;
};

const {
  graphQLSchema,
  simpleQuery,
  otherQuery,
  clientSideSchema,
  clientSideSchemaQuery,
  clientSideOnlySchema,
  clientSideOnlyQuery
} = resolveFiles({
  graphQLSchema: "../../service/__tests__/fixtures/schema.graphql",
  simpleQuery: "./fixtures/simpleQuery.graphql",
  otherQuery: "./fixtures/otherQuery.graphql",
  clientSideSchema: "./fixtures/clientSideSchema.graphql",
  clientSideSchemaQuery: "./fixtures/clientSideSchemaQuery.graphql",
  clientSideOnlySchema: "./fixtures/clientSideOnlySchema.graphql",
  clientSideOnlyQuery: "./fixtures/clientSideOnlyQuery.graphql"
});

const fullSchema = execute(buildSchema(graphQLSchema), gql(introspectionQuery))
  .data;

const clientSideSchemaTag = `
  gql\`
  ${clientSideSchema}
  \`
`;

const serverSideSchemaTag = `
  gql\`
  type Query {
    hello: String!
    serverSideField: ServerField!
  }

  type ServerField {
    serverData: String!
  }

  type RemovedField {
    id: ID!
    name: RemovedType
  }

  type RemovedType {
    fieldName: String
  }
  \`
  `;

describe("client:codegen", () => {
  test
    .fs({
      "./schema.json": JSON.stringify(fullSchema.__schema),
      "./queryOne.graphql": simpleQuery.toString(),
      "./apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./**.graphql"],
            service: {
              name: "my-service-name",
              localSchemaFile: "./schema.json"
            }
          }
        }
      `
    })
    .command([
      "client:codegen",
      "API.swift",
      "--config=apollo.config.js",
      "--target=swift"
    ])
    .it("writes swift types from local schema", () => {
      expect(fs.readFileSync("API.swift").toString()).toMatchSnapshot();
    });

  test
    .fs({
      "schema.graphql": graphQLSchema,
      "queryOne.graphql": simpleQuery.toString(),
      "apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./queryOne.graphql"],
            service: {
              name: "my-service-name",
              localSchemaFile: "./schema.graphql"
            }
          }
        }
      `
    })
    .command([
      "client:codegen",
      "API.swift",
      "--config=apollo.config.js",
      "--target=swift"
    ])
    .it("writes swift types from local schema in a graphql file", () => {
      expect(fs.readFileSync("API.swift").toString()).toMatchSnapshot();
    });

  test
    .fs({
      "schema.json": JSON.stringify(fullSchema.__schema),
      "queryOne.graphql": simpleQuery.toString(),
      "apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./queryOne.graphql"],
            service: {
              name: "my-service-name",
              localSchemaFile: "./schema.json"
            }
          }
        }
      `
    })
    .command([
      "client:codegen",
      "API.swift",
      "--target=swift",
      "--operationIdsPath=myOperationIDs.json"
    ])
    .it("generates operation IDs for swift files when flag is set", () => {
      expect(
        fs.readFileSync("myOperationIDs.json").toString()
      ).toMatchSnapshot();
    });

  // FIXME: doesn't write anything significant to snapshot
  test
    .skip()
    .fs({
      "schema.json": JSON.stringify(fullSchema.__schema),
      "queryOne.graphql": simpleQuery.toString(),
      "queryTwo.graphql": otherQuery.toString(),
      "apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./**.graphql"],
            service: {
              name: "my-service-name",
              localSchemaFile: "./schema.json"
            }
          }
        }
      `
    })
    .command([
      "client:codegen",
      "--only=queryTwo.graphql",
      "--target=swift",
      "outDirectory"
    ])
    .it("handles only flag for Swift target", () => {
      const [filePath] = fs.readdirSync("./outDirectory");
      const file = fs.readFileSync(`./outDirectory/${filePath}`).toString();

      // expect(file).toMatchSnapshot();
    });

  test
    .fs({
      "schema.json": JSON.stringify(fullSchema.__schema),
      "queryOne.graphql": simpleQuery.toString(),
      "apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./**.graphql"],
            service: {
              name: "my-service-name",
              localSchemaFile: "./schema.json"
            }
          }
        }
      `
    })
    .command(["client:codegen", "--target=scala", "API.scala"])
    .it("writes types for scala", () => {
      expect(fs.readFileSync("API.scala").toString()).toMatchSnapshot();
    });

  test
    .fs({
      "schema.json": JSON.stringify(fullSchema.__schema),
      "queryOne.graphql": simpleQuery.toString(),
      "apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./**.graphql"],
            service: {
              name: "my-service-name",
              localSchemaFile: "./schema.json"
            }
          }
        }
      `
    })
    .command([
      "client:codegen",
      "--target=typescript",
      "--outputFlat",
      "API.ts"
    ])
    .it("writes types for typescript", () => {
      expect(fs.readFileSync("API.ts").toString()).toMatchSnapshot();
    });

  test
    .fs({
      "schema.json": JSON.stringify(fullSchema.__schema),
      "clientSideSchema.graphql": clientSideSchema.toString(),
      "clientSideSchemaQuery.graphql": clientSideSchemaQuery.toString(),
      "apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./**.graphql"],
            service: {
              name: "my-service-name",
              localSchemaFile: "./schema.json"
            }
          }
        }
      `
    })
    .command([
      "client:codegen",
      "--target=typescript",
      "--outputFlat",
      "API.ts"
    ])
    .it("writes typescript types for query with client-side data", () => {
      expect(fs.readFileSync("API.ts").toString()).toMatchSnapshot();
    });
});

// OLD TESTS BELOW -- TO REWRITE

// describe("successful codegen", () => {
// test
//   .do(() => {
//     vol.fromJSON({
//       "schema.json": JSON.stringify(fullSchema.__schema),
//       "queryOne.graphql": simpleQuery.toString()
//     });
//   })
//   .command(["codegen:generate", "--schema=schema.json", "API.swift"])
//   .it("infers Swift target and writes types", () => {
//     expect(mockFS.readFileSync("API.swift").toString()).toMatchSnapshot();
//   });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.graphql": graphQLSchema,
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command(["codegen:generate", "--schema=schema.graphql", "API.swift"])
//     .it(
//       "infers Swift target and writes types when schema is a GraphQL file",
//       () => {
//         expect(mockFS.readFileSync("API.swift").toString()).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.js": serverSideSchemaTag,
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command(["codegen:generate", "--schema=schema.js", "API.swift"])
//     .it("infers Swift target and writes types when schema is a JS file", () => {
//       expect(mockFS.readFileSync("API.swift").toString()).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.ts": serverSideSchemaTag,
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command(["codegen:generate", "--schema=schema.ts", "API.swift"])
//     .it("infers Swift target and writes types when schema is a TS file", () => {
//       expect(mockFS.readFileSync("API.swift").toString()).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--operationIdsPath=myOperationIDs.json",
//       "API.swift"
//     ])
//     .it("generates operation IDs files when flag is set", () => {
//       expect(
//         mockFS.readFileSync("myOperationIDs.json").toString()
//       ).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString(),
//         "queryTwo.graphql": otherQuery.toString(),
//         "outDirectory/__create_this_directory": ""
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--only=queryTwo.graphql",
//       "--target=swift",
//       "outDirectory"
//     ])
//     .it("handles only flag for Swift target", () => {
//       expect(
//         Object.entries(vol.toJSON("outDirectory")).map(arr => [
//           path.relative(__dirname, arr[0]),
//           arr[1]
//         ])
//       ).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command(["codegen:generate", "--schema=schema.json", "API.scala"])
//     .it("infers Scala target and writes types", () => {
//       expect(mockFS.readFileSync("API.scala").toString()).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--outputFlat",
//       "API.ts"
//     ])
//     .it("infers TypeScript target and writes types", () => {
//       expect(mockFS.readFileSync("API.ts").toString()).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "clientSideSchema.graphql": clientSideSchema.toString(),
//         "clientSideSchemaQuery.graphql": clientSideSchemaQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--clientSchema=clientSideSchema.graphql",
//       "--outputFlat",
//       "API.ts"
//     ])
//     .it(
//       "infers TypeScript target and writes types for query with client-side data",
//       () => {
//         expect(mockFS.readFileSync("API.ts").toString()).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "clientSideSchemaTag.js": clientSideSchemaTag.toString(),
//         "clientSideSchemaQuery.graphql": clientSideSchemaQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--clientSchema=clientSideSchemaTag.js",
//       "--outputFlat",
//       "API.ts"
//     ])
//     .it(
//       "infers TypeScript target and writes types for query with client-side data with schema in a JS file",
//       () => {
//         expect(mockFS.readFileSync("API.ts").toString()).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "clientSideSchemaTag.js": clientSideSchemaTag.toString(),
//         "clientSideSchemaQuery.graphql": clientSideSchemaQuery.toString(),
//         "package.json": `
//         {
//           "apollo": {
//             "schemas": {
//               "serverSchema": {
//                 "schema": "schema.json"
//               },
//               "default": {
//                 "schema": "clientSideSchemaTag.js",
//                 "extends": "serverSchema",
//                 "clientSide": true
//               }
//             }
//           }
//         }
//         `
//       });
//     })
//     .command(["codegen:generate", "--outputFlat", "API.ts"])
//     .it(
//       "infers TypeScript target and writes types for query with client-side data with schema in a JS file from config",
//       () => {
//         expect(mockFS.readFileSync("API.ts").toString()).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "clientSideOnlySchema.graphql": clientSideOnlySchema.toString(),
//         "clientSideOnlyQuery.graphql": clientSideOnlyQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--clientSchema=clientSideOnlySchema.graphql",
//       "--outputFlat",
//       "API.ts"
//     ])
//     .it(
//       "infers TypeScript target and writes types for query with only client-side data",
//       () => {
//         expect(mockFS.readFileSync("API.ts").toString()).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--outputFlat",
//       "API.js"
//     ])
//     .it("infers Flow target and writes types", () => {
//       expect(mockFS.readFileSync("API.js").toString()).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--useFlowExactObjects",
//       "--outputFlat",
//       "API.js"
//     ])
//     .it("writes exact Flow types when the flag is set", () => {
//       expect(mockFS.readFileSync("API.js").toString()).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--useFlowReadOnlyTypes",
//       "--outputFlat",
//       "API.js"
//     ])
//     .it("writes read-only Flow types when the flag is set", () => {
//       expect(mockFS.readFileSync("API.js").toString()).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "queryOne.graphql": simpleQuery.toString()
//       });
//     })
//     .command(["codegen:generate", "--schema=schema.json", "operations.json"])
//     .it("infers JSON target and writes operations", () => {
//       expect(
//         mockFS.readFileSync("operations.json").toString()
//       ).toMatchSnapshot();
//     });
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "directory/component.tsx": `
//           gql\`
//             query SimpleQuery {
//               hello
//             }
//           \`;
//         `
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--queries=**/*.tsx",
//       "--target=typescript"
//     ])
//     .it(
//       "writes TypeScript types into a __generated__ directory next to sources when no output is set",
//       () => {
//         expect(
//           mockFS
//             .readFileSync("directory/__generated__/SimpleQuery.ts")
//             .toString()
//         ).toMatchSnapshot();
//         expect(
//           mockFS.readFileSync("__generated__/globalTypes.ts").toString()
//         ).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "directory/component.jsx": `
//           gql\`
//             query SimpleQuery {
//               hello
//             }
//           \`;
//         `
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--queries=**/*.jsx",
//       "--target=flow"
//     ])
//     .it(
//       "writes Flow types into a __generated__ directory next to sources when no output is set",
//       () => {
//         expect(
//           mockFS
//             .readFileSync("directory/__generated__/SimpleQuery.js")
//             .toString()
//         ).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "directory/component.tsx": `
//           gql\`
//             query SimpleQuery {
//               hello
//             }
//           \`;
//         `
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--queries=**/*.tsx",
//       "--target=typescript",
//       "__foo__"
//     ])
//     .it(
//       "writes TypeScript types to a custom directory next to sources when output is set",
//       () => {
//         expect(
//           mockFS.readFileSync("directory/__foo__/SimpleQuery.ts").toString()
//         ).toMatchSnapshot();
//         expect(
//           mockFS.readFileSync("__foo__/globalTypes.ts").toString()
//         ).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "directory/component.tsx": `
//           gql\`
//             query SimpleQuery {
//               someEnum
//             }
//           \`;
//         `
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--queries=**/*.tsx",
//       "--target=typescript",
//       "--globalTypesFile=__foo__/bar.ts"
//     ])
//     .it(
//       "writes TypeScript global types to a custom path when globalTypesFile is set",
//       () => {
//         expect(
//           mockFS
//             .readFileSync("directory/__generated__/SimpleQuery.ts")
//             .toString()
//         ).toMatchSnapshot();
//         expect(
//           mockFS.readFileSync("__foo__/bar.ts").toString()
//         ).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "directory/component.jsx": `
//           gql\`
//             query SimpleQuery {
//               hello
//             }
//           \`;
//         `
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--queries=**/*.jsx",
//       "--target=flow",
//       "__foo__"
//     ])
//     .it(
//       "writes Flow types to a custom directory next to sources when output is set",
//       () => {
//         expect(
//           mockFS.readFileSync("directory/__foo__/SimpleQuery.js").toString()
//         ).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "directory/component.tsx": `
//             gql\`
//               query SimpleQuery {
//                 hello
//               }
//             \`;
//           `
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--queries=**/*.tsx",
//       "--target=typescript",
//       ""
//     ])
//     .it(
//       "writes TypeScript types next to sources when output is set to empty string",
//       () => {
//         expect(
//           mockFS.readFileSync("directory/SimpleQuery.ts").toString()
//         ).toMatchSnapshot();
//         expect(
//           mockFS.readFileSync("globalTypes.ts").toString()
//         ).toMatchSnapshot();
//       }
//     );
//   test
//     .do(() => {
//       vol.fromJSON({
//         "schema.json": JSON.stringify(fullSchema.__schema),
//         "directory/component.jsx": `
//             gql\`
//               query SimpleQuery {
//                 hello
//               }
//             \`;
//           `
//       });
//     })
//     .command([
//       "codegen:generate",
//       "--schema=schema.json",
//       "--queries=**/*.jsx",
//       "--target=flow",
//       ""
//     ])
//     .it(
//       "writes Flow types next to sources when output is set to empty string",
//       () => {
//         expect(
//           mockFS.readFileSync("directory/SimpleQuery.js").toString()
//         ).toMatchSnapshot();
//       }
//     );
// });
// describe("error handling", () => {
//   test
//     .command(["codegen:generate", "--target=foobar"])
//     .catch(err => expect(err.message).toMatch(/Unsupported target: foobar/))
//     .it("errors with an unsupported target");
//   test
//     .command(["codegen:generate", "--target=swift"])
//     .catch(err =>
//       expect(err.message).toMatch(/The output path must be specified/)
//     )
//     .it("errors when no output file is provided");
//   test
//     .command(["codegen:generate", "output-file"])
//     .catch(err =>
//       expect(err.message).toMatch(
//         /Could not infer target from output file type, please use --target/
//       )
//     )
//     .it("errors when target cannot be inferred");
// });
