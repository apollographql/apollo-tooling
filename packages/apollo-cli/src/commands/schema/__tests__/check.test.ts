// this is because of herkou-cli-utils hacky mocking system on their console logger
import { stdout, mockConsole } from "heroku-cli-util";
import * as path from "path";
import * as fs from "fs";
import { test as setup } from "apollo-cli-test";
import { introspectionQuery, print, execute, buildSchema } from "graphql";
import gql from "graphql-tag";
import { ENGINE_URI } from "../../../engine";
import { VALIDATE_SCHEMA } from "../../../operations/validateSchema";

const test = setup.do(() => mockConsole());
const ENGINE_API_KEY = "service:test:1234";
const hash = "12345";
const localSchema = { __schema: { fakeSchema: true } };
const fullSchema = execute(
  buildSchema(
    fs.readFileSync(path.resolve(__dirname, "./fixtures/schema.graphql"), {
      encoding: "utf-8",
    })
  ),
  gql(introspectionQuery)
).data;

const localSuccess = nock => {
  nock
    .post("/graphql", {
      query: print(gql(introspectionQuery)),
      operationName: "IntrospectionQuery",
      variables: {},
    })
    .reply(200, { data: localSchema });
};

const engineSuccess = ({ schema, tag, results } = {}) => nock => {
  nock
    .matchHeader("x-api-key", ENGINE_API_KEY)
    .post("/", {
      operationName: "CheckSchema",
      variables: {
        id: "test",
        schema: schema || localSchema.__schema,
        tag: tag || "current",
        gitContext: {
          commit: /.+/i,
          remoteUrl: "https://github.com/apollographql/apollo-cli",
          committer: /@/i,
        },
      },
      query: print(VALIDATE_SCHEMA),
    })
    .reply(200, {
      data: {
        service: {
          schema: {
            checkSchema: {
              changes: results || [
                {
                  type: "WARNING",
                  code: "FIELD_REMOVED",
                  description: "Field `User.firstName` removed",
                },
                {
                  type: "BREAKING",
                  code: "ARG_CHANGE_TYPE",
                  description: "Argument id on `Query.user` changed to ID!",
                },
                {
                  type: "NOTICE",
                  code: "DEPRECATION_ADDED",
                  description: "Field `User.lastName` was deprecated",
                },
                {
                  type: "NOTICE",
                  code: "FIELD_ADDED",
                  description: "Field `User.fullName` was added",
                },
              ],
            },
          },
        },
      },
    });
};

describe("successful checks", () => {
  test
    .nock("http://localhost:4000", localSuccess)
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .stdout()
    .command(["schema:check"])
    .it("compares against the latest uploaded schema", () => {
      expect(stdout).toContain("BREAKING");
      expect(stdout).toContain("NOTICE");
      expect(stdout).toContain("WARNING");
    });

  test
    .nock("http://localhost:4000", localSuccess)
    .nock(ENGINE_URI, engineSuccess({ results: [] }))
    .env({ ENGINE_API_KEY })
    .stdout()
    .command(["schema:check"])
    .it(
      "compares against the latest uploaded schema with no change",
      ({ stdout }) => {
        expect(stdout).toContain("No changes");
      }
    );

  test
    .stdout()
    .nock("https://staging.example.com", localSuccess)
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .command(["schema:check", "-e=https://staging.example.com/graphql"])
    .it("compares against a schema from a custom remote", () => {
      expect(stdout).toContain("BREAKING");
      expect(stdout).toContain("NOTICE");
      expect(stdout).toContain("WARNING");
    });

  test
    .stdout()
    .nock("https://staging.example.com", nock => {
      nock
        .matchHeader("Authorization", "1234")
        .matchHeader("Hello", "World")
        .post("/graphql", {
          query: print(gql(introspectionQuery)),
          operationName: "IntrospectionQuery",
          variables: {},
        })
        .reply(200, { data: localSchema });
    })
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .command([
      "schema:check",
      "-e=https://staging.example.com/graphql",
      "--header=Authorization: 1234",
      "--header=Hello: World",
    ])
    .it(
      "calls engine with a schema from a custom remote with custom headers",
      () => {
        expect(stdout).toContain("BREAKING");
        expect(stdout).toContain("NOTICE");
        expect(stdout).toContain("WARNING");
      }
    );

  test
    .stdout()
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .command([
      "schema:check",
      `-e=${path.resolve(__dirname, "./fixtures/introspection-result.json")}`,
    ])
    .it(
      "calls engine with a schema from an introspection result on the filesystem",
      () => {
        expect(stdout).toContain("BREAKING");
        expect(stdout).toContain("NOTICE");
        expect(stdout).toContain("WARNING");
      }
    );

  test
    .stdout()
    .nock(ENGINE_URI, engineSuccess({ schema: fullSchema.__schema }))
    .env({ ENGINE_API_KEY })
    .command([
      "schema:check",
      `-e=${path.resolve(__dirname, "./fixtures/schema.graphql")}`,
    ])
    .it(
      "calls engine with a schema from a schema file on the filesystem",
      () => {
        expect(stdout).toContain("BREAKING");
        expect(stdout).toContain("NOTICE");
        expect(stdout).toContain("WARNING");
      }
    );

  test
    .nock("http://localhost:4000", localSuccess)
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .stdout()
    .command(["schema:check", "--json"])
    .it("allows formatting success as json", () => {
      expect(stdout).toContain('"type": "BREAKING"');
    });
});

describe("error handling", () => {
  test
    .command(["schema:check"])
    .catch(err => expect(err.message).toMatch(/No service passed/))
    .it("errors with no service api key");
});
