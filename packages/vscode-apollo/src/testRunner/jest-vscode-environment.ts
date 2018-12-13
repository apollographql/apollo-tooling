/**
 * Exposes the Visual Studio Code extension API to the Jest testing environment.
 * For custom environments reference:
 * @see https://jestjs.io/docs/en/configuration.html#testenvironment-string
 */

// Using import here results in `jest_environment_node_1.default`
// The `.default` in this case doesn't exist. Interop issue with the built
// version of the package?
const NodeEnvironment = require("jest-environment-node");
import * as vscode from "vscode";

class VsCodeEnvironment extends NodeEnvironment {
  constructor(config: any) {
    super(config);
  }

  public async setup() {
    await super.setup();
    this.global.vscode = vscode;

    // For some reason this seems to be required for the Jest output to be streamed
    // to the Debug Console.
    process.stdout.write = this.logger;
    process.stderr.write = this.logger;
  }

  public async teardown() {
    this.global.vscode = {};
    return await super.teardown();
  }

  public runScript(script: any) {
    return super.runScript(script);
  }

  private logger(line: string) {
    console.log(line);
    return true;
  }
}

module.exports = VsCodeEnvironment;
