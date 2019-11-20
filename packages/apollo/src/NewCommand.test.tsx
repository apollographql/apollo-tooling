import React from "react";
import { Config } from "@oclif/config";
import ApolloCommand, { useOclif, useConfig } from "./NewCommand";
import { render } from "ink";

describe("useConfig", () => {
  it("should load config with hook", async done => {
    class Tester extends ApolloCommand {
      render() {
        const config = useConfig();
        if (config) done();
        return null;
      }
    }
    await Tester.run([]);
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
