# Changelog
## vNEXT

## v1.7.1
#### :rocket: Feature
* `apollo-codegen-typescript`
  * [#535](https://github.com/apollographql/apollo-cli/pull/535) [TS] Sort global types so order is not determined by order of appearance ([@danilobuerger](https://github.com/danilobuerger))

#### :bug: Bug Fix
* `apollo-codegen-typescript`
  * [#544](https://github.com/apollographql/apollo-cli/pull/544) Prepend ./ to TS relative paths to make them valid, Closes [#543](https://github.com/apollographql/apollo-cli/issues/543) ([@shadaj](https://github.com/shadaj))
* `apollo-cli`
  * [#534](https://github.com/apollographql/apollo-cli/pull/534) Allow to run `apollo codegen:generate --watch` on non tty devices ([@trojanowski](https://github.com/trojanowski))

#### Committers: 3
- Daniel Trojanowski ([@trojanowski](https://github.com/trojanowski))
- Danilo Bürger ([@danilobuerger](https://github.com/danilobuerger))
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.7.0
#### :rocket: Feature
* `apollo-language-server`, `apollo-vscode`
  * [#536](https://github.com/apollographql/apollo-cli/pull/536) Display status of loading tasks for config and Engine stats ([@shadaj](https://github.com/shadaj))
* `apollo-cli`
  * [#533](https://github.com/apollographql/apollo-cli/pull/533) Fall back to other methods of schema loading when one fails ([@shadaj](https://github.com/shadaj))
* `apollo-cli`, `apollo-codegen-typescript`
  * [#525](https://github.com/apollographql/apollo-cli/pull/525) [TS] Elimate newlines at beginning of file and add newline at end of file ([@danilobuerger](https://github.com/danilobuerger))
* `apollo-cli`, `apollo-codegen-core`
  * [#526](https://github.com/apollographql/apollo-cli/pull/526) Scan all files for queries and reduce use of default endpoints ([@shadaj](https://github.com/shadaj))
* `apollo-cli`, `apollo-codegen-typescript`, `common-test`
  * [#520](https://github.com/apollographql/apollo-cli/pull/520) [TS] Dedup enums and inputs by using global types file ([@danilobuerger](https://github.com/danilobuerger))
* `apollo-codegen-typescript`
  * [#518](https://github.com/apollographql/apollo-cli/pull/518) [typescript] Only output comment for input if there is one ([@danilobuerger](https://github.com/danilobuerger))

#### :bug: Bug Fix
* `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  * [#519](https://github.com/apollographql/apollo-cli/pull/519)  [VSCode] Fix detection of projects inside folders ([@shadaj](https://github.com/shadaj))
* `apollo-cli`
  * [#511](https://github.com/apollographql/apollo-cli/pull/511) Stop default flag values from overriding custom config ([@klujanrosas](https://github.com/klujanrosas))

#### :memo: Documentation
* `apollo-cli`, `apollo-vscode`
  * [#521](https://github.com/apollographql/apollo-cli/pull/521) Add README for the VS Code extension ([@shadaj](https://github.com/shadaj))
* `apollo-cli`
  * [#524](https://github.com/apollographql/apollo-cli/pull/524) Fixed broken command links ([@danilobuerger](https://github.com/danilobuerger))

#### Committers: 3
- Danilo Bürger ([@danilobuerger](https://github.com/danilobuerger))
- Kenneth Luján Rosas ([@klujanrosas](https://github.com/klujanrosas))
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.6.0
#### :rocket: Feature
* `apollo-language-server`
  * [#516](https://github.com/apollographql/apollo-cli/pull/516) Code complete default query variables ([@shadaj](https://github.com/shadaj))
* `apollo-language-server`, `apollo-vscode`
  * [#515](https://github.com/apollographql/apollo-cli/pull/515) Fix missing descriptions and add more hover information for arguments ([@shadaj](https://github.com/shadaj))
* `apollo-cli`, `apollo-codegen-core`, `apollo-language-server`, `apollo-vscode-webview`, `apollo-vscode`
  * [#512](https://github.com/apollographql/apollo-cli/pull/512) React UI for webviews, fix file tracking and fragment spreads ([@shadaj](https://github.com/shadaj))
* `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  * [#508](https://github.com/apollographql/apollo-cli/pull/508) Support jumping to definitions in schema ([@shadaj](https://github.com/shadaj))

#### :memo: Documentation
* `apollo-cli`
  * [#505](https://github.com/apollographql/apollo-cli/pull/505) Add docs for Apollo config ([@shadaj](https://github.com/shadaj))

#### :house: Internal
* `apollo-cli`, `apollo-language-server`
  * [#506](https://github.com/apollographql/apollo-cli/pull/506) Share validation logic between CLI and language server ([@shadaj](https://github.com/shadaj))

#### Committers: 2
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))
- Thomas Ladd ([@TLadd](https://github.com/TLadd))

## v1.5.0
#### :rocket: Feature
* `apollo-language-server`, `apollo-vscode`
  * [#504](https://github.com/apollographql/apollo-cli/pull/504) Add Apollo VS Code extension ([@shadaj](https://github.com/shadaj))
* `apollo-cli`, `apollo-codegen-core`
  * [#497](https://github.com/apollographql/apollo-cli/pull/497) Load config from apollo.config.js or package.json ([@shadaj](https://github.com/shadaj))

#### :house: Internal
* `apollo-cli`
  * [#492](https://github.com/apollographql/apollo-cli/pull/492) Make TypeScript options more consistent across packages ([@shadaj](https://github.com/shadaj))

#### Committers: 1
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.4.0
#### :rocket: Feature
* `apollo-cli`
  * [#484](https://github.com/apollographql/apollo-cli/pull/484) Support file watching for codegen:generate ([@shadaj](https://github.com/shadaj))
  * [#490](https://github.com/apollographql/apollo-cli/pull/490) Assume the output is a directory when it has no extension ([@shadaj](https://github.com/shadaj))
  * [#485](https://github.com/apollographql/apollo-cli/pull/485) Support loading server-side schema from JS/TS files ([@shadaj](https://github.com/shadaj))
  * [#483](https://github.com/apollographql/apollo-cli/pull/483) Support generating based on .graphql schema files ([@shadaj](https://github.com/shadaj))

#### :bug: Bug Fix
* `apollo-cli`, `apollo-codegen-core`
  * [#488](https://github.com/apollographql/apollo-cli/pull/488)  Handle cases when storing server-defined models in local state ([@shadaj](https://github.com/shadaj))

#### :house: Internal
* `apollo-cli`
  * [#489](https://github.com/apollographql/apollo-cli/pull/489) Remove unused locals in Apollo CLI ([@shadaj](https://github.com/shadaj))

#### Committers: 1
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

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
