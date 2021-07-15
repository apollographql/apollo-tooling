# CHANGELOG

-> *Note:* This project used to live in the [apollo-tooling](https://github.com/apollographql/apollo-tooling) repo. Refer to the [apollo-tooling CHANGELOG](https://github.com/apollographql/apollo-tooling/blob/master/CHANGELOG.md) for full list of changes before April 25, 2021. See below for filtered changelog from apollo-tooling.

## Legacy apollo-tooling Changelog

### apollo-tools@0.5.1
- Remove dependency on `apollo-env`, so using this package no longer installs polyfills.

### apollo-env@0.10.0

- deps: Updated `node-fetch` to v2.6.1

### apollo-env@0.9.0

- The following utility functions are no longer exported from `apollo-env` and can now be found in the `apollo-graphql` library:
    - `createHash`
    - `isNodeLike`
    - `mapValues`
    - `isNotNullOrDefined`

### `apollo-language-server@1.14.3`

- `apollo-language-server@1.14.3`
  - Fix issue where fragment definitions only included in `@client` fields would not be stripped ((AP-682)(https://golinks.io/AP-682), [#1454](https://github.com/apollographql/apollo-tooling/pull/1454))

### `apollo-language-server@1.14.2`

- `apollo-language-server@1.14.2`
  - Fix #735 caused #928 error implement [#1461](https://github.com/apollographql/apollo-tooling/pull/1461)
  - Fix dirname parsing for ts config files [#1463](https://github.com/apollographql/apollo-tooling/pull/1463)

### `vscode-apollo@1.9.1`, `apollo-language-server@1.14.1`

- `apollo-language-server@1.14.1`
  - Fix cache invalidation bug for reload schema which caused outdated results in autocomplete [#1446](https://github.com/apollographql/apollo-tooling/pull/1446)

### `vscode-apollo@1.9.0`, `apollo-language-server@1.14.0`, `apollo-codegen-swift@0.34.2`

- `vscode-apollo@1.9.0`
  - Add Dart support for vscode [#1385](https://github.com/apollographql/apollo-tooling/pull/1385)
- `apollo-language-server@1.14.0`
  - Add Dart operation extraction [#1385](https://github.com/apollographql/apollo-tooling/pull/1385)
- `apollo-codegen-swift@0.34.2`
  - Prevent compiler warnings for redundant access-level modifiers when using `--namespace` [1241](https://github.com/apollographql/apollo-tooling/pull/1241)

### `apollo-language-server@1.5.2`, `vscode-apollo@1.5.2`

- `apollo-language-server@1.5.2`
  - fix single apollo.config breaking others loaded at the same time [#1055](https://github.com/apollographql/apollo-tooling/pull/1055)
  - Fix broken fileSet.includesFile to use full filepath [#1055](https://github.com/apollographql/apollo-tooling/pull/1055)
- `vscode-apollo@1.5.2`

### `apollo-env@0.3.1`

- `apollo-env@0.3.1`
  - Fix core-js dependency by pinning to `3.0.0-beta.3` [#961](https://github.com/apollographql/apollo-tooling/pull/961)

### `apollo-language-server@1.4.1`

- `apollo-language-server` 1.4.1
  - Fix edge case for empty operations [#959](https://github.com/apollographql/apollo-tooling/pull/959)

### `apollo-language-server@1.0.0`

> NOTE: Many of the updates and changes in this release came from a complete rebuild of the Apollo CLI in preparation for GraphQL summit. Many of these changes can be traced to [this commit](https://github.com/apollographql/apollo-tooling/commit/d2d73f9c597845355b7ee267e411d80d1c493043) but aren't tied to a specific pull request, and won't be linked.

- `apollo-language-server@1.0.0`
  - Initial release of `apollo-language-server` to support `vscode-apollo`, and `apollo`
  - Supports editor features for...
    - Autocompletion of GraphQL documents
    - Hover information for fields anr arguments
    - Type definitions and references
    - Code lenses for open files
- `vscode-apollo@1.0.0`
  - Initial Release of `vscode-apollo`
  - Switching of schema tags [#632](https://github.com/apollographql/apollo-tooling/pull/632)
  - Supports all of the editor features exposed by `apollo-language-server`

#### :rocket: Feature

- `apollo-language-server`, `apollo-vscode`
  - [#536](https://github.com/apollographql/apollo-tooling/pull/536) Display status of loading tasks for config and Engine stats ([@shadaj](https://github.com/shadaj))

#### :bug: Bug Fix

- `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  - [#519](https://github.com/apollographql/apollo-tooling/pull/519) [VSCode] Fix detection of projects inside folders ([@shadaj](https://github.com/shadaj))

#### :memo: Documentation

- `apollo-cli`, `apollo-vscode`
  - [#521](https://github.com/apollographql/apollo-tooling/pull/521) Add README for the VS Code extension ([@shadaj](https://github.com/shadaj))

#### :rocket: Feature

- `apollo-language-server`
  - [#516](https://github.com/apollographql/apollo-tooling/pull/516) Code complete default query variables ([@shadaj](https://github.com/shadaj))
- `apollo-language-server`, `apollo-vscode`
  - [#515](https://github.com/apollographql/apollo-tooling/pull/515) Fix missing descriptions and add more hover information for arguments ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-codegen-core`, `apollo-language-server`, `apollo-vscode-webview`, `apollo-vscode`
  - [#512](https://github.com/apollographql/apollo-tooling/pull/512) React UI for webviews, fix file tracking and fragment spreads ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  - [#508](https://github.com/apollographql/apollo-tooling/pull/508) Support jumping to definitions in schema ([@shadaj](https://github.com/shadaj))

#### :house: Internal

- `apollo-cli`, `apollo-language-server`
  - [#506](https://github.com/apollographql/apollo-tooling/pull/506) Share validation logic between CLI and language server ([@shadaj](https://github.com/shadaj))

#### :rocket: Feature

- `apollo-language-server`, `apollo-vscode`
  - [#504](https://github.com/apollographql/apollo-tooling/pull/504) Add Apollo VS Code extension ([@shadaj](https://github.com/shadaj))
