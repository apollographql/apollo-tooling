jest.mock("apollo-codegen-core/lib/localfs", () => {
  return require("../../../__mocks__/localfs");
});

// this is because of herkou-cli-utils hacky mocking system on their console logger
import { stdout, mockConsole } from "heroku-cli-util";
import * as path from "path";
import * as fs from "fs";
import { test as setup } from "apollo-cli-test";
import { introspectionQuery, print, execute, buildSchema } from "graphql";
import gql from "graphql-tag";
import { fs as mockFS, vol } from "apollo-codegen-core/lib/localfs";

const test = setup.do(() => mockConsole());
const fullSchema = execute(
  buildSchema(
    fs.readFileSync(
      path.resolve(__dirname, "../../schema/__tests__/fixtures/schema.graphql"),
      {
        encoding: "utf-8"
      }
    )
  ),
  gql(introspectionQuery)
).data;

const simpleQuery = fs.readFileSync(
  path.resolve(__dirname, "./fixtures/simpleQuery.graphql")
);

beforeEach(() => {
  vol.reset();
  vol.fromJSON({
    __blankFileSoDirectoryExists: ""
  });
});

jest.setTimeout(15000);

describe("successful codegen", () => {
  test
    .do(() => {
      vol.fromJSON({
        "schema.json": JSON.stringify(fullSchema.__schema),
        "queryOne.graphql": simpleQuery.toString()
      });
    })
    .command(["codegen:generate", "--schema=schema.json", "API.swift"])
    .it("infers Swift target and writes types", () => {
      expect(mockFS.readFileSync("API.swift").toString()).toMatchSnapshot();
    });

  test
    .do(() => {
      vol.fromJSON({
        "schema.json": JSON.stringify(fullSchema.__schema),
        "queryOne.graphql": simpleQuery.toString()
      });
    })
    .command(["codegen:generate", "--schema=schema.json", "API.scala"])
    .it("infers Scala target and writes types", () => {
      expect(mockFS.readFileSync("API.scala").toString()).toMatchSnapshot();
    });

  test
    .do(() => {
      vol.fromJSON({
        "schema.json": JSON.stringify(fullSchema.__schema),
        "queryOne.graphql": simpleQuery.toString()
      });
    })
    .command(["codegen:generate", "--schema=schema.json", "API.ts"])
    .it("infers TypeScript target and writes types", () => {
      expect(mockFS.readFileSync("API.ts").toString()).toMatchSnapshot();
    });

  test
    .do(() => {
      vol.fromJSON({
        "schema.json": JSON.stringify(fullSchema.__schema),
        "queryOne.graphql": simpleQuery.toString()
      });
    })
    .command(["codegen:generate", "--schema=schema.json", "API.js"])
    .it("infers Flow target and writes types", () => {
      expect(mockFS.readFileSync("API.js").toString()).toMatchSnapshot();
    });

  test
    .do(() => {
      vol.fromJSON({
        "schema.json": JSON.stringify(fullSchema.__schema),
        "queryOne.graphql": simpleQuery.toString()
      });
    })
    .command(["codegen:generate", "--schema=schema.json", "operations.json"])
    .it("infers JSON target and writes operations", () => {
      expect(
        mockFS.readFileSync("operations.json").toString()
      ).toMatchSnapshot();
    });

  test
    .do(() => {
      vol.fromJSON({
        "schema.json": JSON.stringify(fullSchema.__schema),
        "directory/component.tsx": `
          gql\`
            query SimpleQuery {
              hello
            }
          \`;
        `
      });
    })
    .command([
      "codegen:generate",
      "--schema=schema.json",
      "--queries=**/*.tsx",
      "--target=typescript"
    ])
    .it("writes TypeScript types next to sources when no output is set", () => {
      expect(
        mockFS.readFileSync("directory/SimpleQuery.ts").toString()
      ).toMatchSnapshot();
    });

  test
    .do(() => {
      vol.fromJSON({
        "schema.json": JSON.stringify(fullSchema.__schema),
        "directory/component.jsx": `
          gql\`
            query SimpleQuery {
              hello
            }
          \`;
        `
      });
    })
    .command([
      "codegen:generate",
      "--schema=schema.json",
      "--queries=**/*.jsx",
      "--target=flow"
    ])
    .it("writes Flow types next to sources when no output is set", () => {
      expect(
        mockFS.readFileSync("directory/SimpleQuery.js").toString()
      ).toMatchSnapshot();
    });
});

describe("error handling", () => {
  test
    .command(["codegen:generate", "--target=foobar"])
    .catch(err => expect(err.message).toMatch(/Unsupported target: foobar/))
    .it("errors with an unsupported target");

  test
    .command(["codegen:generate", "--target=swift"])
    .catch(err =>
      expect(err.message).toMatch(/The output path must be specified/)
    )
    .it("errors when no output file is provided");
});
