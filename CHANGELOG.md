# Changelog

## Upcoming

<!-- add changes for upcoming versions here -->

## `apollo@2.3.1`

- `apollo` 2.3.1
  - Fixed path building issues on Windows [#917](https://github.com/apollographql/apollo-tooling/pull/917)

## `apollo@2.3.0`, `vscode-apollo@1.4.0`, `apollo-language-server@1.3.0`

- `apollo` 2.3.0
  - Fixed filesystem issues on Windows [#810](https://github.com/apollographql/apollo-tooling/pull/810)
  - Fixed codegen for Scala users [#686](https://github.com/apollographql/apollo-tooling/pull/686)
- `vscode-apollo` 1.4.0
  - Added a status bar action to show service stats in client projects [#840](https://github.com/apollographql/apollo-tooling/pull/840)
  - Added monorepo support for multiple projects open at once [#840](https://github.com/apollographql/apollo-tooling/pull/840)
- `apollo-language-server` 1.3.0
  - Added listener for `getStats` to provide service stats for extensions [#840](https://github.com/apollographql/apollo-tooling/pull/840)

## `apollo@2.0.x`

- `apollo` 2.0.x

## `apollo@2.0.x`

- `apollo` 2.0.x

## `apollo@2.0.x`

- `apollo` 2.0.x

## `apollo@2.0.x`

- `apollo` 2.0.x

## `apollo@2.0.x`

- `apollo` 2.0.x

## `apollo@2.0.x`

- `apollo` 2.0.x

## `apollo@2.0.8`

- Fixed issue with package lockfile [commit](https://github.com/apollographql/apollo-tooling/commit/892172c473b533dcf52eecd55273d74ce725105c)

## `apollo@2.0.7`, `apollo-language-server@1.0.5`, `vscode-apollo@1.1.2`

- `apollo-language-server` 1.0.5
  - Fix mutations to engine for schema uploads & operation registration [commit](https://github.com/apollographql/apollo-tooling/commit/0caf59250851cb1aaef1e4b24fac2474de13f449)

## `apollo@2.0.6`, `vscode-apollo@1.1.1`, `apollo-language-server@1.0.4`

- `apollo-language-server` 1.0.4
  - Changed engine queries to use `me` field instead of `service` to look up services [commit](https://github.com/apollographql/apollo-tooling/commit/50254d606296dbecfca981ea6785caaced300f89)

## `apollo@2.0.5`, `vscode-apollo@1.1.0`

- `apollo` 2.0.5
  - Fix schema tag diagnostics
  - Provide ability to go from sdl to operations via references [commit](https://github.com/apollographql/apollo-tooling/commit/4f00eb9995fe5a25f52879e13bc9e3e80e72acad)

## `apollo@2.0.4`

- Fixed config to only use service name from the correct key types [commit](https://github.com/apollographql/apollo-tooling/commit/6891f6a19c6d7de1c352944394ada9cba08ee87e)
- Adjust priority of engine api key parsing to prefer flag over env key [commit](https://github.com/apollographql/apollo-tooling/commit/0694e84c4476848dd06252ac61f5a14353681ff2)

## `apollo@2.0.3`, `vscode-apollo@1.0.3`

- `apollo` 2.0.3
  - Fallback to using the engine service from the api key if not specified in configs [commit](https://github.com/apollographql/apollo-tooling/commit/59bc1ea84248cfbfcd74bddd40f610a4cce89c25)

## `apollo@2.0.2`, `vscode-apollo@1.0.2`

- `apollo` 2.0.2
  - fixed missing dotenv dependency [#663](https://github.com/apollographql/apollo-tooling/commit/5557b7813ec15b9c2a57a34e83118ccbe0705ce1)

## `apollo@2.0.1`

- Added better errors around missing services
- Updated config documentation
- Fixed failures with missing service name

## `apollo@2.0.0`, `vscode-apollo@1.0.0`, `apollo-language-server@1.0.0`

> NOTE: Many of the updates and changes in this release came from a complete rebuild of the Apollo CLI in preparation for GraphQL summit. Many of these changes can be traced to [this commit](https://github.com/apollographql/apollo-tooling/commit/d2d73f9c597845355b7ee267e411d80d1c493043) but aren't tied to a specific pull request, and won't be linked.

- `apollo` 2.0.0

  - :rocket: Features
    - `queries:register` to register operations with the apollo platform [#621](https://github.com/apollographql/apollo-tooling/pull/621)
    - Update `graphql` to version 14 [#624](https://github.com/apollographql/apollo-tooling/pull/624)
    - Supports a `.env` file for engine API keys [commit](https://github.com/apollographql/apollo-tooling/commit/4a2bccfd900fcd61b75caa5bf891ac7b049f3844)
  - :bug: Fixes & Changes
    - Fixed config file resolution [#591](https://github.com/apollographql/apollo-tooling/pull/591)
  - :boom: Breaking Changes
    - Introduced a new `apollo.config.js` format []()
    - Changed format of `queries:extract` manifest to be more extensible [#611](https://github.com/apollographql/apollo-tooling/pull/611)
    - Changed manifest hash encoding to SHA-256 instead of SHA-512 [#611](https://github.com/apollographql/apollo-tooling/pull/611)
    - Deprecated apollo `schema:*`, and `codegen:*` commands and aliased usage to new commands
      - `apollo codegen:generate` aliases to `apollo client:codegen`
      - `apollo schema:check` aliases to `apollo service:check`
      - `apollo schema:download` aliases to `apollo service:download`
      - `apollo schema:publish` aliases to `apollo service:push`
      - `apollo plugins:add` aliases to `apollo plugins:install`
      - `apollo plugins:unlink` and `apollo plugins:remove` aliases to `apollo plugins:uninstall`
    - Removed apollo `queries:*` commands
      - `apollo client:check` should be used in place of `apollo queries:check`
      - `apollo client:extract` should be used in place of `apollo queries:extract`
    - Deprecated `--queries` flag in client commands in place of the `--includes` flag

- `apollo-language-server` 1.0.0

  - Initial release of [apollo-language-server]() to support `vscode-apollo`, and `apollo`
  - Supports editor features for...
    - Autocompletion of GraphQL documents
    - Hover information for fields anr arguments
    - Type definitions and references
    - Code lenses for open files

- `vscode-apollo` 1.0.0
  - Initial Release of [vscode-apollo]()
  - Switching of schema tags [#632](https://github.com/apollographql/apollo-tooling/pull/632)
  - Supports all of the editor features exposed by `apollo-language-server`

## `apollo@1.9.2`, `apollo-language-server@0.1.10`, `apollo-codegen-swift@0.28.1`, `apollo-codegen-core@0.28.1`

- `apollo` 1.9.2
  - Fixed codegen issues listed below
- `apollo-language-server` 0.1.10
  - Fixed version of `vscode-languageserver` to follow a stable version instead of `next`
- `apollo-codegen-swift` 0.28.1
  - Fixed swift enums to conform to Hashable [#578](https://github.com/apollographql/apollo-tooling/pull/578)
- `apollo-codegen-core` 0.28.1
  - Fixed `mergeInFieldsFromFragmentSpreads` when flag isn't specified [#537](https://github.com/apollographql/apollo-tooling/issues/537)

## `apollo@1.9.1`

- Fixes formatting of the `schema:download` response to match previous codegen schemas [#573](https://github.com/apollographql/apollo-tooling/pull/573)

## `apollo@1.9.0`

- Added `queries:extract` command to write a manifest of client queries [#553](https://github.com/apollographql/apollo-tooling/pull/553)

---

## v1.8.3

- `apollo`
  - [#546](https://github.com/apollographql/apollo-tooling/pull/546) Add `outputGlobalTypes` option to specify path for global types ([@danilobuerger](https://github.com/danilobuerger))
  - [#562](https://github.com/apollographql/apollo-tooling/pull/562) Preserve "\_\_schema" key when outputting JSON schema from `schema:download` [@jamesmbourne](https://github.com/jamesmbourne))
  - [#565](https://github.com/apollographql/apollo-tooling/pull/565) Support for self-signed certificates ([@robertomg](https://github.com/robertomg))
- `apollo-codegen-swift`
  - Treat `mergeInFieldsFromFragmentSpreads` as false in Swift codegen when flag isn't specified. Fixes [#537](https://github.com/apollographql/apollo-tooling/issues/537). [@martijnwalraven](https://github.com/martijnwalraven))

## v1.7.1

#### :rocket: Feature

- `apollo-codegen-typescript`
  - [#535](https://github.com/apollographql/apollo-tooling/pull/535) [TS] Sort global types so order is not determined by order of appearance ([@danilobuerger](https://github.com/danilobuerger))

#### :bug: Bug Fix

- `apollo-codegen-typescript`
  - [#544](https://github.com/apollographql/apollo-tooling/pull/544) Prepend ./ to TS relative paths to make them valid, Closes [#543](https://github.com/apollographql/apollo-tooling/issues/543) ([@shadaj](https://github.com/shadaj))
- `apollo-cli`
  - [#534](https://github.com/apollographql/apollo-tooling/pull/534) Allow to run `apollo codegen:generate --watch` on non tty devices ([@trojanowski](https://github.com/trojanowski))

#### Committers: 3

- Daniel Trojanowski ([@trojanowski](https://github.com/trojanowski))
- Danilo Bürger ([@danilobuerger](https://github.com/danilobuerger))
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.7.0

#### :rocket: Feature

- `apollo-language-server`, `apollo-vscode`
  - [#536](https://github.com/apollographql/apollo-tooling/pull/536) Display status of loading tasks for config and Engine stats ([@shadaj](https://github.com/shadaj))
- `apollo-cli`
  - [#533](https://github.com/apollographql/apollo-tooling/pull/533) Fall back to other methods of schema loading when one fails ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-codegen-typescript`
  - [#525](https://github.com/apollographql/apollo-tooling/pull/525) [TS] Elimate newlines at beginning of file and add newline at end of file ([@danilobuerger](https://github.com/danilobuerger))
- `apollo-cli`, `apollo-codegen-core`
  - [#526](https://github.com/apollographql/apollo-tooling/pull/526) Scan all files for queries and reduce use of default endpoints ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-codegen-typescript`, `common-test`
  - [#520](https://github.com/apollographql/apollo-tooling/pull/520) [TS] Dedup enums and inputs by using global types file ([@danilobuerger](https://github.com/danilobuerger))
- `apollo-codegen-typescript`
  - [#518](https://github.com/apollographql/apollo-tooling/pull/518) [typescript] Only output comment for input if there is one ([@danilobuerger](https://github.com/danilobuerger))

#### :bug: Bug Fix

- `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  - [#519](https://github.com/apollographql/apollo-tooling/pull/519) [VSCode] Fix detection of projects inside folders ([@shadaj](https://github.com/shadaj))
- `apollo-cli`
  - [#511](https://github.com/apollographql/apollo-tooling/pull/511) Stop default flag values from overriding custom config ([@klujanrosas](https://github.com/klujanrosas))

#### :memo: Documentation

- `apollo-cli`, `apollo-vscode`
  - [#521](https://github.com/apollographql/apollo-tooling/pull/521) Add README for the VS Code extension ([@shadaj](https://github.com/shadaj))
- `apollo-cli`
  - [#524](https://github.com/apollographql/apollo-tooling/pull/524) Fixed broken command links ([@danilobuerger](https://github.com/danilobuerger))

#### Committers: 3

- Danilo Bürger ([@danilobuerger](https://github.com/danilobuerger))
- Kenneth Luján Rosas ([@klujanrosas](https://github.com/klujanrosas))
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.6.0

#### :rocket: Feature

- `apollo-language-server`
  - [#516](https://github.com/apollographql/apollo-tooling/pull/516) Code complete default query variables ([@shadaj](https://github.com/shadaj))
- `apollo-language-server`, `apollo-vscode`
  - [#515](https://github.com/apollographql/apollo-tooling/pull/515) Fix missing descriptions and add more hover information for arguments ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-codegen-core`, `apollo-language-server`, `apollo-vscode-webview`, `apollo-vscode`
  - [#512](https://github.com/apollographql/apollo-tooling/pull/512) React UI for webviews, fix file tracking and fragment spreads ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-language-server`, `apollo-vscode`
  - [#508](https://github.com/apollographql/apollo-tooling/pull/508) Support jumping to definitions in schema ([@shadaj](https://github.com/shadaj))

#### :memo: Documentation

- `apollo-cli`
  - [#505](https://github.com/apollographql/apollo-tooling/pull/505) Add docs for Apollo config ([@shadaj](https://github.com/shadaj))

#### :house: Internal

- `apollo-cli`, `apollo-language-server`
  - [#506](https://github.com/apollographql/apollo-tooling/pull/506) Share validation logic between CLI and language server ([@shadaj](https://github.com/shadaj))

#### Committers: 2

- Shadaj Laddad ([@shadaj](https://github.com/shadaj))
- Thomas Ladd ([@TLadd](https://github.com/TLadd))

## v1.5.0

#### :rocket: Feature

- `apollo-language-server`, `apollo-vscode`
  - [#504](https://github.com/apollographql/apollo-tooling/pull/504) Add Apollo VS Code extension ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-codegen-core`
  - [#497](https://github.com/apollographql/apollo-tooling/pull/497) Load config from apollo.config.js or package.json ([@shadaj](https://github.com/shadaj))

#### :house: Internal

- `apollo-cli`
  - [#492](https://github.com/apollographql/apollo-tooling/pull/492) Make TypeScript options more consistent across packages ([@shadaj](https://github.com/shadaj))

#### Committers: 1

- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.4.0

#### :rocket: Feature

- `apollo-cli`
  - [#484](https://github.com/apollographql/apollo-tooling/pull/484) Support file watching for codegen:generate ([@shadaj](https://github.com/shadaj))
  - [#490](https://github.com/apollographql/apollo-tooling/pull/490) Assume the output is a directory when it has no extension ([@shadaj](https://github.com/shadaj))
  - [#485](https://github.com/apollographql/apollo-tooling/pull/485) Support loading server-side schema from JS/TS files ([@shadaj](https://github.com/shadaj))
  - [#483](https://github.com/apollographql/apollo-tooling/pull/483) Support generating based on .graphql schema files ([@shadaj](https://github.com/shadaj))

#### :bug: Bug Fix

- `apollo-cli`, `apollo-codegen-core`
  - [#488](https://github.com/apollographql/apollo-tooling/pull/488) Handle cases when storing server-defined models in local state ([@shadaj](https://github.com/shadaj))

#### :house: Internal

- `apollo-cli`
  - [#489](https://github.com/apollographql/apollo-tooling/pull/489) Remove unused locals in Apollo CLI ([@shadaj](https://github.com/shadaj))

#### Committers: 1

- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.3.0

#### :rocket: Feature

- `apollo-cli`, `apollo-codegen-core`
  - [#480](https://github.com/apollographql/apollo-tooling/pull/480) Initial support for client-side schemas ([@shadaj](https://github.com/shadaj))

#### :house: Internal

- `apollo-cli`, `apollo-codegen-core`, `apollo-codegen-flow-legacy`, `apollo-codegen-flow`, `apollo-codegen-scala`, `apollo-codegen-swift`, `apollo-codegen-typescript-legacy`, `apollo-codegen-typescript`
  - [#479](https://github.com/apollographql/apollo-tooling/pull/479) Run `build` before publishing to prevent uploading stale code ([@shadaj](https://github.com/shadaj))

#### Committers: 1

- Shadaj Laddad ([@shadaj](https://github.com/shadaj))

## v1.2.0

#### :rocket: Feature

- `apollo-cli`
  - [#473](https://github.com/apollographql/apollo-tooling/pull/473) Queries command ([@jbaxleyiii](https://github.com/jbaxleyiii))
  - [#470](https://github.com/apollographql/apollo-tooling/pull/470) Restore ability to put generated files in a directory relative to source ([@mike-marcacci](https://github.com/mike-marcacci))
  - [#463](https://github.com/apollographql/apollo-tooling/pull/463) Add back JSON as target (for Apollo Android) ([@shadaj](https://github.com/shadaj))
  - [#456](https://github.com/apollographql/apollo-tooling/pull/456) Handle bash expansions for the queries argument ([@shadaj](https://github.com/shadaj))

#### :bug: Bug Fix

- `apollo-cli`, `apollo-codegen-core`
  - [#465](https://github.com/apollographql/apollo-tooling/pull/465) Improve typing of options and add more codegen tests ([@shadaj](https://github.com/shadaj))
  - [#464](https://github.com/apollographql/apollo-tooling/pull/464) Command-level unit tests for codegen ([@shadaj](https://github.com/shadaj))
- `apollo-cli`
  - [#470](https://github.com/apollographql/apollo-tooling/pull/470) Restore ability to put generated files in a directory relative to source ([@mike-marcacci](https://github.com/mike-marcacci))
  - [#457](https://github.com/apollographql/apollo-tooling/pull/457) Allow legacy targets to be used when manually specified ([@shadaj](https://github.com/shadaj))
- `apollo-codegen-flow`
  - [#461](https://github.com/apollographql/apollo-tooling/pull/461) Change generated flow files extension to .js instead of .ts ([@TLadd](https://github.com/TLadd))

#### :memo: Documentation

- `apollo-cli`
  - [#475](https://github.com/apollographql/apollo-tooling/pull/475) added clarity to schema:download ([@mwarger](https://github.com/mwarger))

#### :house: Internal

- Other
  - [#477](https://github.com/apollographql/apollo-tooling/pull/477) Add lerna-changelog to manage generating changelogs ([@shadaj](https://github.com/shadaj))
- `apollo-cli`, `apollo-codegen-core`
  - [#465](https://github.com/apollographql/apollo-tooling/pull/465) Improve typing of options and add more codegen tests ([@shadaj](https://github.com/shadaj))
  - [#464](https://github.com/apollographql/apollo-tooling/pull/464) Command-level unit tests for codegen ([@shadaj](https://github.com/shadaj))

#### Committers: 5

- James Baxley ([@jbaxleyiii](https://github.com/jbaxleyiii))
- Mat Warger ([@mwarger](https://github.com/mwarger))
- Mike Marcacci ([@mike-marcacci](https://github.com/mike-marcacci))
- Shadaj Laddad ([@shadaj](https://github.com/shadaj))
- Thomas Ladd ([@TLadd](https://github.com/TLadd))

# Legacy Apollo Codegen Changelog

## v0.20.2

- The TypeScript and Flow targets now use block comments to better handle multiline comments in schemas
- Fix crash when running on a version of Node that already supports Array.flatMap

## v0.20.1

- Fix issue with `flow-legacy` target being unusable

## v0.20.0

- **BREAKING**: The `typescript` and `flow` targets now refer to the modern implementations. The deprecated legacy targets are available under `typescript-legacy` and `flow-legacy`.
- **BREAKING**: The `--output` parameter to the CLI is now required for all targets.
- The TypeScript and Flow targets now support outputting types to either a single file or a directory, where types for each query will be separated
