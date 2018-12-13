/*
 * Wrapper around Jest's runCLI function. Responsible for passing in the config,
 * executing, and passing along failures.
 */
import { ResultsObject, runCLI } from "jest";
import { resolve } from "path";
import { config } from "./jest-config";

export async function run(_testRoot: string, callback: TestRunnerCallback) {
  try {
    const testDirectory = resolve(__dirname, "..", "..", "src");
    const { globalConfig, results } = await runCLI(config, [testDirectory]);
    const failures = collectTestFailureMessages(results);

    if (failures.length > 0) {
      console.log("globalConfig:", globalConfig);
      callback(null, failures);
      return;
    }

    callback(null);
  } catch (e) {
    callback(e);
  }
}

/**
 * Collect failure messages from Jest test results.
 *
 * @param results Jest test results.
 */
function collectTestFailureMessages(results: ResultsObject): string[] {
  const failures = results.testResults.reduce<string[]>((acc, testResult) => {
    if (testResult.failureMessage) acc.push(testResult.failureMessage);
    return acc;
  }, []);

  return failures;
}

export type TestRunnerCallback = (error: Error | null, failures?: any) => void;
