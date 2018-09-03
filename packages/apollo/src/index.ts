// run the CLI
export { run } from "@oclif/command";

// export utils for usage
export * from "./printer/ast";

export { printFromSchemas, printChanges } from "./printer/print";
export { diffSchemas } from "./printer/diff";
