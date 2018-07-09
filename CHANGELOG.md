# Changelog
## vNEXT

## v1.3.0
#### :rocket: Feature
* `apollo-cli`, `apollo-codegen-core`
  * [#480](https://github.com/apollographql/apollo-cli/pull/480) Initial support for client-side schemas ([@shadaj](https://github.com/shadaj))

#### :house: Internal
* `apollo-cli`, `apollo-codegen-core`, `apollo-codegen-flow-legacy`, `apollo-codegen-flow`, `apollo-codegen-scala`, `apollo-codegen-swift`, `apollo-codegen-typescript-legacy`, `apollo-codegen-typescript`
  * [#479](https://github.com/apollographql/apollo-cli/pull/479) Run `build` before publishing to prevent uploading stale code ([@shadaj](https://github.com/shadaj))

#### Committers: 1
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.2.0
#### :rocket: Feature
* `apollo-cli`
  * [#473](https://github.com/apollographql/apollo-cli/pull/473) Queries command ([@jbaxleyiii](https://github.com/jbaxleyiii))
  * [#470](https://github.com/apollographql/apollo-cli/pull/470) Restore ability to put generated files in a directory relative to source ([@mike-marcacci](https://github.com/mike-marcacci))
  * [#463](https://github.com/apollographql/apollo-cli/pull/463) Add back JSON as target (for Apollo Android) ([@shadaj](https://github.com/shadaj))
  * [#456](https://github.com/apollographql/apollo-cli/pull/456) Handle bash expansions for the queries argument ([@shadaj](https://github.com/shadaj))

#### :bug: Bug Fix
* `apollo-cli`, `apollo-codegen-core`
  * [#465](https://github.com/apollographql/apollo-cli/pull/465) Improve typing of options and add more codegen tests ([@shadaj](https://github.com/shadaj))
  * [#464](https://github.com/apollographql/apollo-cli/pull/464) Command-level unit tests for codegen ([@shadaj](https://github.com/shadaj))
* `apollo-cli`
  * [#470](https://github.com/apollographql/apollo-cli/pull/470) Restore ability to put generated files in a directory relative to source ([@mike-marcacci](https://github.com/mike-marcacci))
  * [#457](https://github.com/apollographql/apollo-cli/pull/457) Allow legacy targets to be used when manually specified ([@shadaj](https://github.com/shadaj))
* `apollo-codegen-flow`
  * [#461](https://github.com/apollographql/apollo-cli/pull/461) Change generated flow files extension to .js instead of .ts ([@TLadd](https://github.com/TLadd))

#### :memo: Documentation
* `apollo-cli`
  * [#475](https://github.com/apollographql/apollo-cli/pull/475) added clarity to schema:download ([@mwarger](https://github.com/mwarger))

#### :house: Internal
* Other
  * [#477](https://github.com/apollographql/apollo-cli/pull/477) Add lerna-changelog to manage generating changelogs ([@shadaj](https://github.com/shadaj))
* `apollo-cli`, `apollo-codegen-core`
  * [#465](https://github.com/apollographql/apollo-cli/pull/465) Improve typing of options and add more codegen tests ([@shadaj](https://github.com/shadaj))
  * [#464](https://github.com/apollographql/apollo-cli/pull/464) Command-level unit tests for codegen ([@shadaj](https://github.com/shadaj))

#### Committers: 5
- James Baxley ([@jbaxleyiii](https://github.com/jbaxleyiii))
- Mat Warger ([@mwarger](https://github.com/mwarger))
- Mike Marcacci ([@mike-marcacci](https://github.com/mike-marcacci))
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))
- Thomas Ladd ([@TLadd](https://github.com/TLadd))

# Legacy Apollo Codegen Changelog
## v0.20.2
+ The TypeScript and Flow targets now use block comments to better handle multiline comments in schemas
+ Fix crash when running on a version of Node that already supports Array.flatMap

## v0.20.1
+ Fix issue with `flow-legacy` target being unusable

## v0.20.0
+ **BREAKING**: The `typescript` and `flow` targets now refer to the modern implementations. The deprecated legacy targets are available under `typescript-legacy` and `flow-legacy`.
+ **BREAKING**: The `--output` parameter to the CLI is now required for all targets.
+ The TypeScript and Flow targets now support outputting types to either a single file or a directory, where types for each query will be separated
