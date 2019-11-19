import React from "react";
import { Config } from "@oclif/config";
import ApolloCommand, { useOclif, useConfig } from "./NewCommand";

describe("useConfig", () => {
  it("should load config with hook", async done => {
    // const command = new ApolloCommand());
    class Test extends ApolloCommand {
      render() {
        console.log("RENDER");
        const config = useConfig();
        if (config) done();
        return null;
      }
    }
    const testCommand = new Test([], new Config({ root: "/" }));
    console.log(JSON.stringify(testCommand.init));
    await testCommand.init();
    await testCommand.run();
  });
  it("should fail if config fails to load", () => {});
});

describe("useOclif", () => {
  it("should load flags passed to command", () => {});
  it("should fail if flags cant be loaded", () => {});
});

describe("config loading", () => {
  it("", () => {});
});
