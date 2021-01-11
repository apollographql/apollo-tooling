# Apollo CLI

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollographql/apollo-tooling/master/LICENSE) [![npm](https://img.shields.io/npm/v/apollo.svg)](https://www.npmjs.com/package/apollo) [![Get on Slack](https://img.shields.io/badge/spectrum-join-orange.svg)](https://spectrum.chat/apollo?tab=posts)

Apollo CLI brings together your GraphQL clients and servers with tools for validating your schema, linting your operations for compatibility with your server, and generating static types for improved client-side type safety.

<!-- toc -->
* [Apollo CLI](#apollo-cli)
* [Usage](#usage)
* [Commands](#commands)
* [Configuration](#configuration)
* [Code Generation](#code-generation)
* [Contributing](#contributing)
<!-- tocstop -->

# Usage

**Disclaimer**: The following API documentation is only for the latest version released on NPM, and may not be accurate for previous or future versions.

<!-- usage -->
```sh-session
$ npm install -g apollo
$ apollo COMMAND
running command...
$ apollo (-v|--version|version)
apollo/2.32.1 darwin-x64 node-v12.19.0
$ apollo --help [COMMAND]
USAGE
  $ apollo COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`apollo help [COMMAND]`](#apollo-help-command)
* [`apollo plugins`](#apollo-plugins)
* [`apollo plugins:install PLUGIN...`](#apollo-pluginsinstall-plugin)
* [`apollo plugins:link PLUGIN`](#apollo-pluginslink-plugin)
* [`apollo plugins:uninstall PLUGIN...`](#apollo-pluginsuninstall-plugin)
* [`apollo plugins:update`](#apollo-pluginsupdate)

## `apollo help [COMMAND]`

display help for apollo

```
USAGE
  $ apollo help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v2.2.3/src/commands/help.ts)_

## `apollo plugins`

list installed plugins

```
USAGE
  $ apollo plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ apollo plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/index.ts)_

## `apollo plugins:install PLUGIN...`

installs a plugin into the CLI

```
USAGE
  $ apollo plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  plugin to install

OPTIONS
  -f, --force    yarn install with force flag
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a 
  user-installed plugin with a 'hello' command will override the core 
  plugin implementation. This is useful if a user needs to update core 
  plugin functionality in the CLI without the need to patch and update the 
  whole CLI.

ALIASES
  $ apollo plugins:add

EXAMPLES
  $ apollo plugins:install myplugin 
  $ apollo plugins:install https://github.com/someuser/someplugin
  $ apollo plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/install.ts)_

## `apollo plugins:link PLUGIN`

links a plugin into the CLI for development

```
USAGE
  $ apollo plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Installation of a linked plugin will override a user-installed or core 
  plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' 
  command, installing a linked plugin with a 'hello' command will override 
  the user-installed or core plugin implementation. This is useful for 
  development work.

EXAMPLE
  $ apollo plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/link.ts)_

## `apollo plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
USAGE
  $ apollo plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

ALIASES
  $ apollo plugins:unlink
  $ apollo plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/uninstall.ts)_

## `apollo plugins:update`

update installed plugins

```
USAGE
  $ apollo plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/update.ts)_
<!-- commandsstop -->

# Configuration

The Apollo CLI and VS Code extension can be configured with an Apollo config file. Apollo configuration is stored as a plain object in an `apollo.config.js` file which exports the configuration. For more information about configuring an Apollo project, see: https://www.apollographql.com/docs/devtools/apollo-config/.

> Note: the use of the `apollo` key in the project's package.json file for configuration is deprecated, and will no longer be supported in Apollo v3

You'll need to set up your Apollo configuration for all the features of the Apollo CLI and VS Code extension to work correctly. For full details on how to do that, [visit our docs](https://www.apollographql.com/docs/devtools/apollo-config/). A basic configuration (`apollo.config.js` style) looks something like this:

```js
module.exports = {
  client: {
    name: "My Client Project",
    service: "my-service-name"
  }
};
```

# Code Generation

## Accompanying Libraries

See [Apollo iOS](https://github.com/apollographql/apollo-ios) for details on the mapping from GraphQL results to Swift types, as well as runtime support for executing queries and mutations. For Scala, see [React Apollo Scala.js](https://github.com/apollographql/react-apollo-scalajs) for details on how to use generated Scala code in a Scala.js app with Apollo Client.

## `gql` template support

If the source file for generation is a JavaScript or TypeScript file, the codegen will try to extrapolate the queries inside the [gql tag](https://github.com/apollographql/graphql-tag) templates.

The tag name is configurable using the CLI `--tagName` option.

## Typescript and Flow

When using the codegen command with Typescript or Flow, make sure to add the `__typename` introspection field to every selection set within your graphql operations.

If you're using a client like `apollo-client` that does this automatically for your GraphQL operations, pass in the `--addTypename` option to `apollo codegen:generate` to make sure the generated Typescript and Flow types have the `__typename` field as well. This is required to ensure proper type generation support for `GraphQLUnionType` and `GraphQLInterfaceType` fields.

## Why is the \_\_typename field required?

Using the type information from the GraphQL schema, we can infer the possible types for fields. However, in the case of a `GraphQLUnionType` or `GraphQLInterfaceType`, there are multiple types that are possible for that field. This is best modeled using a disjoint union with the `__typename`
as the discriminant.

For example, given a schema:

```graphql
...

interface Character {
  name: String!
}

type Human implements Character {
  homePlanet: String
}

type Droid implements Character {
  primaryFunction: String
}

...
```

Whenever a field of type `Character` is encountered, it could be either a Human or Droid. Human and Droid objects
will have a different set of fields. Within your application code, when interacting with a `Character` you'll want to make sure to handle both of these cases.

Given this query:

```graphql
query Characters {
  characters(episode: NEW_HOPE) {
    name

    ... on Human {
      homePlanet
    }

    ... on Droid {
      primaryFunction
    }
  }
}
```

Apollo Codegen will generate a union type for Character.

```javascript
export type CharactersQuery = {
  characters: Array<
    | {
        __typename: "Human",
        name: string,
        homePlanet: ?string
      }
    | {
        __typename: "Droid",
        name: string,
        primaryFunction: ?string
      }
  >
};
```

This type can then be used as follows to ensure that all possible types are handled:

```javascript
function CharacterFigures({ characters }: CharactersQuery) {
  return characters.map(character => {
    switch (character.__typename) {
      case "Human":
        return (
          <HumanFigure
            homePlanet={character.homePlanet}
            name={character.name}
          />
        );
      case "Droid":
        return (
          <DroidFigure
            primaryFunction={character.primaryFunction}
            name={character.name}
          />
        );
    }
  });
}
```

# Contributing

[![Build Status](https://circleci.com/gh/apollographql/apollo-tooling.svg?style=svg)](https://circleci.com/gh/apollographql/apollo-tooling)

This repo is composed of multiple packages managed by Lerna. The `apollo-cli` contains the core CLI commands. The `apollo-codegen-core` package contains all the compiler APIs needed to implement code generation support for new languages. The other `apollo-codegen-*` packages implement code generation support for individual languages.

Running tests locally:

```
npm install
npm test
```

You can also run `npm` commands within package folders after you have bootstrapped the repository (part of `npm install`).

> Note: if you have issues, try `npm run clean && npm i` to get a fresh install of the packages. Occasionally problems arise when removed dependencies stay around

## Nock tests

To display the debugging messages for nock, run the following command:

```bash
DEBUG=nock.* npm test
```

It can also be helpful to print standard out during testing. To enable logging, add the following configuration to the `stdout` function call during test creation:

```
.stdout({ print: true })
```

## Active Development / Debugging

To simplify the development process, you may want to step through and debug commands whose behavior you're modifying. To do this, run the executable with node in debug mode like so, where `<command>` is a valid CLI command like `client:check` or `service:push`:

```
node --inspect-brk=9002 packages/apollo/bin/run <command>
```

If you're using VS Code, you can run the included "Attach to CLI Debugger" launch task and debug right from VS Code! Otherwise, you may use the Chrome inspector or [other Node debugger](https://nodejs.org/en/docs/guides/debugging-getting-started/) of your choice.

## Regenerating Mocked Network Data

Some integration tests rely on mocked server data (service:check for example). Mock data is generated by making real network requests and recording those requests with [`nock`'s recording feature](https://github.com/nock/nock#recording). Stop mocking network calls and add `nock.recorder.rec()` before network calls are made. For `service:check`, change `apiKey` to a real Apollo API key. Then run the tests and nock will output code to mock requests to the console. You can (and probably should) pare down the request to be less brittle (by only checking for an operation name, for example). See [`src/commands/service/__tests__/check.test.ts`](./packages/apollo/src/commands/service/__tests__/check.test.ts) for an example of how a mocked network request will look.


## Publishing

1. Make sure the `CHANGELOG.md` is updated with all changes committed since the last release. Make sure the versions for each package to update are correct, and there's a blank `Upcoming` section for future work.
2. Run `npm run release:version-bump -- <bumpish>`
   - Can use major, minor, patch, prepatch, etc for the bump type. If not used, the command will prompt and ask for the bump type.
   - This command updates git tags locally and on GitHub
3. Run npm run release:start-ci-publish locally
   - Pushes a `publish/XXXXXXXXXX` tag to GitHub to trigger circle CI build
4. Circle will notify the appropriate Apollo team slack channel when ready to release
   - Slack channel member will confirm through the Apollo Deploy Bot
   - Circle will release to all channels (npm, cli binary to s3, vscode marketplace)
   - Another slack bot notification will confirm success of release.

## Maintainers

- [@JakeDawkins](https://github.com/jakedawkins) (Apollo)
