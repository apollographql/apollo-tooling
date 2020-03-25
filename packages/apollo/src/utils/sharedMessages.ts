import { CLIError } from "@oclif/errors";
import chalk from "chalk";

const errorMessage = [
  "No graph (i.e. service) found to link to Apollo Graph Manager.",
  "In order to run this command, please provide a graph ID using the 'apollo.config.js' file.",
  "\n\nFor more information on configuring the Apollo CLI, please go to",
  "https://go.apollo.dev/t/config"
].join("\n");
export const graphUndefinedError = new CLIError(errorMessage);

export const tagFlagDeprecatedWarning = chalk.yellow(
  "Using the --tag flag is deprecated. Please use --variant (or -v) instead."
);
