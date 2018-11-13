/**
1) prior to each test, create a mock file system with some contents (https://www.npmjs.com/package/mock-fs)
2) run the CLI on that mocked filesystem and have it write to the same place
3) read the written files from the mocked fs and write expectations against what should have been written
  (+ / - the CLI output for testing it is well behaving)
4) clean up the mocked fs for the next test suite.

The tricky bits here are building out a reusable set of fixtures that *can* be referenced from the real
  filesystem (i.e. `import { schema } from "../../../__fixtures__/schema.ts` but one work around may be to use
  a mocked package (we currently have the apollo-test-utils as a fake package that can be imported under the
  root __mocks__ directory.

Shortest path here is to try a new test suite that mocks the fs, uses the CLI on it, then expects / cleans
  up the mocks

The cool think with mock-fs is you should be able to use `fs` prior to calling `mock` and after calling
  `mock.restore()` so it should be able to allow us to import fixtures (edited)
*/

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
let mockFS = require("mock-fs");

const run = setup.do(() => mockConsole());

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
    // a local generated schema file (mocked)
    service: {
      name: "my-service-name",
      localSchemaFile: "./schema.json"
    }
  }
};
`;

describe("client:codegen", () => {
  beforeEach(() => {
    mockFS({
      "schema.json": JSON.stringify(fullSchema.__schema),
      "queryOne.graphql": simpleQuery.toString(),
      "apollo.config.js": apolloConfig.toString(),
      "package.json": JSON.stringify({ name: "my-test" })
    });
  });
  afterEach(() => {
    mockFS.restore();
  });

  run
    .command([
      "client:codegen",
      "--config=apollo.config.js",
      "--schema=schema.json",
      "API.swift"
    ])
    .it("infers Swift target and writes types", () => {
      expect(mockFS.readFileSync("API.swift").toString()).toEqual();
    });
});
