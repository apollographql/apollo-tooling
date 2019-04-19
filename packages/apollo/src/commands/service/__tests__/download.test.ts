// this is because of herkou-cli-utils hacky mocking system on their console logger
import { stdout, mockConsole } from "heroku-cli-util";
import path from "path";
import fs from "fs";
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
const fullSchema = execute(
  buildSchema(
    fs.readFileSync(path.resolve(__dirname, "./fixtures/schema.graphql"), {
      encoding: "utf-8"
    })
  ),
  gql(introspectionQuery)
).data;

const localSuccess = nock => {
  nock
    .post("/graphql", {
      query: print(gql(introspectionQuery)),
      operationName: "IntrospectionQuery",
      variables: {}
    })
    .reply(200, { data: fullSchema });
};

jest.setTimeout(25000);

describe("successful schema downloading", () => {
  // right now, unless a config flag is set, it will search parent dirs
  // for configs, finding the config file for this repo (which we don't want)
  // to avoid that, I added an empty config and a config flag pointing to that.
  test
    .fs({ "my.config.js": "module.exports= {}" })
    .nock("http://localhost:4000", localSuccess)
    .command([
      "service:download",
      "--endpoint=http://localhost:4000/graphql",
      "--config=my.config.js"
    ])
    .it("grabs schema JSON from local server", () => {
      expect(fs.readFileSync("schema.json").toString()).toMatchSnapshot();
    });

  test
    .fs({
      "apollo.config.js": `
        module.exports = {
          "service": {
            "endpoint": { "url": "http://localhost:1234/graphql" },
          }
        }
      `
    })
    .nock("http://localhost:1234", localSuccess)
    .command(["service:download"])
    .it("grabs schema JSON from local server specified in config", () => {
      expect(fs.readFileSync("schema.json").toString()).toMatchSnapshot();
    });
});
