import React from "react";
import ApolloCommand, { useOclif, useConfig } from "./NewCommand";
import * as LS from "apollo-language-server";
import { flags } from "@oclif/command";
import { ApolloConfig } from "apollo-language-server";
import { Box, Text } from "ink";
import { IConfig } from "@oclif/config";
import { ApolloConsumer } from "@apollo/client";

describe("useConfig", () => {
  // todo mock FS here? Why does this test take longer than the config loading ones?
  it("should load config with hook", async done => {
    class Tester extends ApolloCommand {
      render() {
        const config = useConfig();
        if (!config) return;
        expect(config.client.service).toEqual("engine@master");
        expect(config.engine.endpoint).toEqual(
          "https://engine-staging-graphql.apollographql.com/api/graphql"
        );
        done();
        return null;
      }
    }
    await Tester.run([]);
  });
});

describe("useOclif", () => {
  it("should load flags and args with hook", async done => {
    class FlagTester extends ApolloCommand {
      static flags = {
        ...ApolloCommand.flags,
        tag: flags.string()
      };
      static args = [{ name: "first" }, { name: "second" }];

      render() {
        const { flags, args } = useOclif();
        if (!flags || !args) return;
        expect(flags).toEqual({ key: "service:hello:4273", tag: "wow" });
        expect(args).toEqual({ first: "arg1", second: "arg2" });
        done();
        return null;
      }
    }
    await FlagTester.run([
      "--key=service:hello:4273",
      "--tag=wow",
      "arg1",
      "arg2"
    ]);
  });
});

/**
 * This test suite only tests what the CLI command does with the return of
 * `loadConfig` from the language server. The loadConfig function should be
 * tested separately in that package
 */
describe("config loading", () => {
  let loadConfig = jest.spyOn(LS, "loadConfig");
  let consoleError = jest.spyOn(console, "error");
  let rawConfig;
  beforeEach(() => {
    /**
     * FIXME: This raw config value passed to the ApolloConfig
     * constructor is MUTATED by the constructor. This is bad, and
     * an unexpected side-effect of the constructor.
     */
    rawConfig = {
      service: {
        name: "test",
        includes: ["**/*.graphql"],
        excludes: ["**/*.js"]
      }
    };
  });
  afterEach(() => {
    loadConfig.mockClear();
    consoleError.mockClear();
  });

  it("should fail if config fails to load", async done => {
    loadConfig.mockImplementationOnce(async () => {});
    consoleError.mockImplementationOnce(() => {}); // silence

    class Tester extends ApolloCommand {
      static flags = ApolloCommand.flags;
      // make sure the exit in the command doesn't
      // break jest running
      exit(code: number): never {
        expect(code).toEqual(1);
        done(); // make sure exit() is called
        return undefined as never;
      }
      render() {
        return null;
      }
    }
    await Tester.run(["--config=this/will/fail.js"]);
    expect(loadConfig).toBeCalledTimes(1);
    expect(consoleError).toHaveBeenCalledTimes(1);
  });

  it("gets dirname from config flag", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = ApolloCommand.flags;
      render() {
        // this path is absolute to the fs, so we just want to make
        // sure it ends with the dir
        expect(
          loadConfig.mock.calls[0][0].configPath.endsWith("this/will")
        ).toBeTruthy();
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    return MyDummyCommand.run(["--config=this/will/fail.js"]);
  });

  it("sets tag from flag properly", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags, tag: flags.string() };
      render() {
        const { tag } = useConfig();
        expect(tag).toEqual("wow");
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run(["--tag=wow"]);
  });

  it("uses default tag if no flag passed in", async done => {
    class MyDummyCommand extends ApolloCommand {
      render() {
        const { tag } = useConfig();
        expect(tag).toEqual("current");
        done();
        return null;
      }
    }
    // config with a different tag
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    return MyDummyCommand.run([]);
  });

  it("sets engine endpoint based on flags", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags, engine: flags.string() };
      render() {
        const { engine } = useConfig();
        expect(engine.endpoint).toEqual("http://harambe.com");
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run(["--engine=http://harambe.com"]);
  });
  it("sets engine frontend based on flags", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags, frontend: flags.string() };
      render() {
        const { engine } = useConfig();
        expect(engine.frontend).toEqual("http://harambe.com");
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run(["--frontend=http://harambe.com"]);
  });

  it("sets engine apiKey based on flag", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags }; //key: flags.string() };
      render() {
        const { engine } = useConfig();
        expect(engine.apiKey).toEqual("service:harambe:2348497");
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run(["--key=service:harambe:2348497"]);
  });

  it("sets service endpoint from endpoint flag", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags }; //key: flags.string() };
      render() {
        const { service } = useConfig();
        expect(service.endpoint.url).toEqual("http://harambe.com/graphql");
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run(["--endpoint=http://harambe.com/graphql"]);
  });

  it("overrides service headers from flag", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags }; //key: flags.string() };
      render() {
        const { service } = useConfig();
        expect(service.endpoint).toEqual({
          url: "http://localhost:4001",
          headers: { auth: "12345" }
        });
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run([
      "--endpoint=http://localhost:4001",
      "--header=auth:12345"
    ]);
  });

  it("does not use header flag without endpoint flag", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags };
      render() {
        const { service } = useConfig();
        expect(service.endpoint).toEqual(undefined);
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run(["--header=auth:abcde"]);
  });

  it("disables ssl validation from flag", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags };
      render() {
        const { service } = useConfig();
        expect(service.endpoint).toEqual({
          headers: undefined,
          skipSSLValidation: true,
          url: "http://localhost:4001"
        });
        done();
        return null;
      }
    }
    loadConfig.mockImplementationOnce(async () => new ApolloConfig(rawConfig));
    MyDummyCommand.run([
      "--endpoint=http://localhost:4001",
      "--skipSSLValidation"
    ]);
  });
  describe("localSchemaFile flag", () => {
    // TODO when build out client config
    it.todo("sets a single schema file for client project");
    it.todo("sets a multiple schema files for client projects");

    it("sets a single schema file for service project", async done => {
      class MyDummyCommand extends ApolloCommand {
        static flags = { ...ApolloCommand.flags };
        render() {
          const { service } = useConfig();
          expect(service.localSchemaFile).toEqual(["./schema.graphql"]);
          done();
          return null;
        }
      }
      loadConfig.mockImplementationOnce(
        async () => new ApolloConfig(rawConfig)
      );
      MyDummyCommand.run(["--localSchemaFile=./schema.graphql"]);
    });

    it("sets a multiple schema files for service projects", async done => {
      class MyDummyCommand extends ApolloCommand {
        static flags = { ...ApolloCommand.flags };
        render() {
          const { service } = useConfig();
          expect(service.localSchemaFile).toEqual([
            "./schema.graphql",
            "./schema2.graphql"
          ]);
          done();
          return null;
        }
      }
      loadConfig.mockImplementationOnce(
        async () => new ApolloConfig(rawConfig)
      );
      MyDummyCommand.run([
        "--localSchemaFile=./schema.graphql,./schema2.graphql"
      ]);
    });
  });
});

describe("ApolloProvider", () => {
  // we're not actually going to test to make sure it _executes_ from here,
  // because I don't want to set up nock and everything that would require
  // here. I'm just going to check that everything is in the context
  it("can be consumed by extending commands", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags };
      render() {
        return (
          <ApolloConsumer>
            {client => {
              expect(client).toBeDefined();
              done();
              return null;
            }}
          </ApolloConsumer>
        );
      }
    }
    MyDummyCommand.run([]);
  });
});

describe("init", () => {
  jest.spyOn(LS.Debug, "SetLoggers");
  it("is called and sets debug loggers", async done => {
    class MyDummyCommand extends ApolloCommand {
      static flags = { ...ApolloCommand.flags };
      render() {
        expect(LS.Debug.SetLoggers).toBeCalled();
        done();
        return null;
      }
    }
    MyDummyCommand.run([]);
  });
});
