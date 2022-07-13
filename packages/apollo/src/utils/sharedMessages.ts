import { CLIError } from "@oclif/errors";

export const graphUndefinedError = new CLIError(
  [
    "No graph found in the Apollo registry.",
    "In order to run this command, please provide a graph ID using the 'apollo.config.js' file.",
    "\n\nFor more information on configuring the Apollo CLI, please go to",
    "https://go.apollo.dev/t/config",
  ].join("\n")
);
