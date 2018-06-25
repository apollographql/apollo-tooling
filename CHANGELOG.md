# Changelog

## vNEXT
+ The TypeScript and Flow targets now use block comments to better handle multiline comments in schemas

## v0.20.1
+ Fix issue with `flow-legacy` target being unusable

## v0.20.0
+ **BREAKING**: The `typescript` and `flow` targets now refer to the modern implementations. The deprecated legacy targets are available under `typescript-legacy` and `flow-legacy`.
+ **BREAKING**: The `--output` parameter to the CLI is now required for all targets.
+ The TypeScript and Flow targets now support outputting types to either a single file or a directory, where types for each query will be separated
