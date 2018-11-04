// run the CLI
export { run } from "@oclif/command";

// export utils for usage
export * from "./diff/ast";
export { diffSchemas } from "./diff";

// export Command base for plugins
export * from "./Command";

// export git utils
export * from "./git";
