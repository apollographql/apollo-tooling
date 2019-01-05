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
  private stdOutRef: any;
  private stdErrRef: any;

  public async setup() {
    await super.setup();
    this.global.vscode = vscode;

    // Save off refs to the original functions so they can be restored on teardown
    this.stdOutRef = process.stdout.write;
    this.stdErrRef = process.stderr.write;

    // This seems to be required for Jest's output to be streamed to the Debug Console
    process.stdout.write = this.logger;
    process.stderr.write = this.logger;
  }

  public async teardown() {
    process.stdout.write = this.stdOutRef;
    process.stderr.write = this.stdErrRef;

    this.global.vscode = {};
    return await super.teardown();
  }

  private logger(line: string) {
    console.log(line);
    return true;
  }
}

module.exports = VsCodeEnvironment;
