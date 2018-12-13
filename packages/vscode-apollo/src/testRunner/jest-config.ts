import { resolve } from "path";

export const config = {
  // This seems to have no effect, though the need may arise when running more tests
  // runInBand: true, // Required due to the way the "vscode" module is injected.
  preset: "ts-jest",
  moduleFileExtensions: ["ts", "js"],
  rootDir: resolve(__dirname, "..", "..", "src"),
  testEnvironment: resolve(__dirname, "jest-vscode-environment.js"),
  setupTestFrameworkScriptFile: resolve(
    __dirname,
    "jest-vscode-framework-setup.js"
  ),
  globals: {
    "ts-jest": {
      tsConfig: resolve(__dirname, "..", "..", "tsconfig.test.json"),
      diagnostics: false
    }
  }
};
