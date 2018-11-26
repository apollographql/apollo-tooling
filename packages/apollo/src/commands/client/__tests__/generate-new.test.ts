// jest.mock("apollo-codegen-core/lib/localfs", () => {
//   return require("../../../../__mocks__/mockFs");
// });

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

const apolloConfig = `
  module.exports = {
    client: {
      includes: ["./**.graphql"],
      service: {
        name: "my-service-name",
        localSchemaFile: "./schema.json"
      }
    }
  }
`;

describe("client:codegen", () => {
  test
    .stdout({ print: true })
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
    .only()
    .fs({
      "schema.graphql": graphQLSchema,
      "queryOne.graphql": simpleQuery.toString(),
      "apollo.config.js": `
        module.exports = {
          client: {
            includes: ["./**.graphql"],
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
});
