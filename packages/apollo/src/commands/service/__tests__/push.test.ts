import path from "path";
import fs from "fs";
import { test as setup } from "apollo-cli-test";

// // this is because of herkou-cli-utils hacky mocking system on their console logger
import { stdout as uiLog, mockConsole } from "heroku-cli-util";
import { introspectionQuery, print, execute, buildSchema } from "graphql";
import gql from "graphql-tag";
import { UPLOAD_SCHEMA } from "../../../../../apollo-language-server/src/engine/operations/uploadSchema";
import { Volume } from "memfs";

const test = setup.do(() => mockConsole());

const ENGINE_URI = "https://engine-graphql.apollographql.com/api/graphql";
const ENGINE_API_KEY = "service:test:1234";
const hash = "12345";
const schemaSource = fs.readFileSync(
  path.resolve(__dirname, "./fixtures/schema.graphql"),
  { encoding: "utf-8" }
);

const fullSchema = execute(buildSchema(schemaSource), gql(introspectionQuery))
  .data;

const introspectionResult = JSON.stringify({ data: fullSchema });

const localSuccess = nock => {
  nock
    .post("/graphql", {
      query: print(gql(introspectionQuery)),
      operationName: "IntrospectionQuery",
      variables: {}
    })
    .reply(200, { data: fullSchema });
};

// TODO: fix post matching to not match all requests :)
const engineSuccess = ({ schema, tag, result } = {}) => nock => {
  nock
    .matchHeader("x-api-key", ENGINE_API_KEY)
    .post(
      /.*/
      // {
      //   operationName: "UploadSchema",
      //   variables: {
      //     schema: schema || fullSchema.__schema,
      //     id: "wow",
      //     tag: tag || "current",
      //     gitContext: {
      //       commit: /.+/i,
      //       remoteUrl: /apollo-tooling/i,
      //       committer: /@/i
      //     }
      //   },
      //   query: print(UPLOAD_SCHEMA)
      // }
    )
    .reply(
      200,
      result || {
        data: {
          service: {
            uploadSchema: {
              code: "UPLOAD_SUCCESS",
              message: "upload was successful",
              tag: { tag: tag || "current", schema: { hash: "12345" } }
            }
          }
        }
      }
    );
};

jest.setTimeout(35000);

describe("successful uploads", () => {
  test
    .fs({ "my.config.js": "module.exports = {}" }) // needed to prevent looking up the tree for config
    .nock("http://localhost:4000", localSuccess)
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .stdout()
    .command(["service:push", "--config=my.config.js"])
    .it("calls engine with a schema from the default remote", () => {
      expect(uiLog).toContain("12345");
    });

  test
    .fs({ "my.config.js": "module.exports = {}" }) // needed to prevent looking up the tree for config
    .nock("http://localhost:4000", localSuccess)
    .nock(ENGINE_URI, engineSuccess())
    .stdout()
    .command([
      "service:push",
      `--key=${ENGINE_API_KEY}`,
      "--config=my.config.js"
    ])
    .it("allows a custom api key", () => {
      expect(uiLog).toContain("12345");
    });

  test
    .stdout()
    .fs({ "my.config.js": "module.exports = {}" }) // needed to prevent looking up the tree for config
    .nock("https://staging.example.com", localSuccess)
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .command([
      "service:push",
      "--endpoint=https://staging.example.com/graphql",
      "--config=my.config.js"
    ])
    .it("calls engine with a schema from a custom remote", ({ stdout }) => {
      expect(uiLog).toContain("12345");
    });

  test
    // needed to prevent looking up the tree for config
    .fs({
      "my.config.js": `module.exports = {
        service: { endpoint: { url: 'https://staging.example.com/graphql' } },
        // engine: { apiKey: '${ENGINE_API_KEY}' } // TODO: fix api key in config file not working
      }`
    })
    .env({ ENGINE_API_KEY })
    .stdout()
    .nock("https://staging.example.com", localSuccess)
    .nock(ENGINE_URI, engineSuccess())
    .command(["service:push", "--config=my.config.js"])
    .it(
      "calls engine with a schema from a custom remote specified in config",
      ({ stdout }) => {
        expect(uiLog).toContain("12345");
      }
    );

  test
    // needed to prevent looking up the tree for config
    .fs({
      "my.config.js": `module.exports = {
        service: {},
        engine: { endpoint: 'https://engine.example.com/' }
      }`
    })
    .nock("http://localhost:4000", localSuccess)
    .nock("https://engine.example.com", engineSuccess())
    .env({ ENGINE_API_KEY })
    .stdout()
    .command(["service:push", "--config=my.config.js"])
    .it("calls engine with a schema from a custom registry", () => {
      expect(uiLog).toContain("12345");
    });

  test
    .fs({ "my.config.js": `module.exports = {}` }) // needed to prevent looking up the tree for config
    .stdout()
    .nock("https://staging.example.com", nock => {
      nock
        .matchHeader("Authorization", "1234")
        .matchHeader("Hello", "World")
        .post("/graphql", {
          query: print(gql(introspectionQuery)),
          operationName: "IntrospectionQuery",
          variables: {}
        })
        .reply(200, { data: fullSchema });
    })
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .command([
      "service:push",
      "--config=my.config.js",
      "--endpoint=https://staging.example.com/graphql",
      "--header=Authorization: 1234",
      "--header=Hello: World"
    ])
    .it(
      "calls engine with a schema from a custom remote with custom headers",
      ({ stdout }) => {
        expect(uiLog).toContain("12345");
      }
    );

  test
    .fs({
      "my.config.js": `module.exports = {}`,
      "introspection-result.json": introspectionResult.toString()
    })
    .stdout()
    .nock(ENGINE_URI, engineSuccess())
    .env({ ENGINE_API_KEY })
    .command([
      "service:push",
      "--config=my.config.js",
      "--localSchemaFile=introspection-result.json"
    ])
    .it(
      "calls engine with a schema from an introspection result on the filesystem",
      ({ stdout }) => {
        expect(uiLog).toContain("12345");
      }
    );

  test
    .fs({
      "my.config.js": `module.exports = {}`,
      "schema.graphql": schemaSource
    })
    .stdout()
    .nock(ENGINE_URI, engineSuccess({ schema: fullSchema.__schema }))
    .env({ ENGINE_API_KEY })
    .command([
      "service:push",
      "--config=my.config.js",
      "--localSchemaFile=schema.graphql"
    ])
    .it(
      "calls engine with a schema from a schema file on the filesystem",
      ({ stdout }) => {
        expect(uiLog).toContain("12345");
      }
    );
});

describe("error handling", () => {
  test
    .fs({ "my.config.js": 'module.exports = { service: { name: "wow"} }' })
    .nock("http://localhost:4000", localSuccess)
    .command(["service:push", "--config=my.config.js"])
    .catch(err => expect(err.message).toMatch(/ENGINE_API_KEY/))
    .it("errors with no service api key");

  test
    .fs({ "my.config.js": "module.exports = { service: {} }" })
    .command(["service:push", "--config=my.config.js"])
    .catch(err =>
      expect(err.message).toMatch(/Try adding a service name or API key/i)
    )
    .it("errors with no service name/api key");

  test
    .fs({ "my.config.js": "module.exports = { service: {} }" })
    .nock("http://localhost:4000", localSuccess)
    .nock(
      ENGINE_URI,
      engineSuccess({
        result: {
          data: {
            service: {
              uploadSchema: {
                code: "NO_CHANGES",
                message: "no changes to current",
                tag: { tag: "current", schema: { hash: "12345" } }
              }
            }
          }
        }
      })
    )
    .env({ ENGINE_API_KEY })
    .stdout()
    .command(["service:push", "--config=my.config.js"])
    .it(
      "gives correct feedback when publishing without changes",
      ({ stdout }) => {
        expect(stdout).toMatch(/No change/);
        expect(uiLog).toContain("12345");
      }
    );
});
