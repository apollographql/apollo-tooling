# Apollo CLI

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollographql/apollo-cli/master/LICENSE) [![npm](https://img.shields.io/npm/v/apollo.svg)](https://www.npmjs.com/package/apollo) [![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

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

<!-- usage -->
```sh-session
$ npm install -g apollo
$ apollo COMMAND
running command...
$ apollo (-v|--version|version)
apollo/1.9.2 darwin-x64 node-v8.11.4
$ apollo --help [COMMAND]
USAGE
  $ apollo COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`apollo codegen:generate [OUTPUT]`](#apollo-codegengenerate-output)
* [`apollo help [COMMAND]`](#apollo-help-command)
* [`apollo queries:check`](#apollo-queriescheck)
* [`apollo queries:extract OUTPUT`](#apollo-queriesextract-output)
* [`apollo schema:check`](#apollo-schemacheck)
* [`apollo schema:download OUTPUT`](#apollo-schemadownload-output)
* [`apollo schema:publish`](#apollo-schemapublish)

## `apollo codegen:generate [OUTPUT]`

Generate static types for GraphQL queries. Can use the published schema in Apollo Engine or a downloaded schema.

```
USAGE
  $ apollo codegen:generate [OUTPUT]

ARGUMENTS
  OUTPUT
      Directory to which generated files will be written.
      - For TypeScript/Flow generators, this specifies a directory relative to each source file by default.
      - For TypeScript/Flow generators with the "outputFlat" flag is set, and for the Swift generator, this specifies a 
      file or directory (absolute or relative to the current working directory) to which:
         - a file will be written for each query (if "output" is a directory)
         - all generated types will be written
      - For all other types, this defines a file (absolute or relative to the current working directory) to which all 
      generated types are written.

OPTIONS
  -h, --help                                 Show command help
  --addTypename                              Automatically add __typename to your queries

  --clientSchema=clientSchema                Path to your client-side GraphQL schema file for `apollo-link-state`
                                             (.graphql, .json, .js, .ts)

  --config=config                            Path to your Apollo config file

  --customScalarsPrefix=customScalarsPrefix  Include a prefix when using provided types for custom scalars

  --globalTypesFile=globalTypesFile          By default, TypeScript will put a file named "globalTypes.ts" inside the
                                             "output" directory. Set "globalTypesFile" to specify a different path.

  --key=key                                  The API key for the Apollo Engine service

  --mergeInFieldsFromFragmentSpreads         Merge fragment fields onto its enclosing type

  --namespace=namespace                      The namespace to emit generated code into.

  --only=only                                Parse all input files, but only output generated code for the specified
                                             file [Swift only]

  --operationIdsPath=operationIdsPath        Path to an operation id JSON map file. If specified, also stores the
                                             operation ids (hashes) as properties on operation types [currently
                                             Swift-only]

  --outputFlat                               By default, TypeScript/Flow will put each generated file in a directory
                                             next to its source file using the value of the "output" as the directory
                                             name. Set "outputFlat" to put all generated files in the directory relative
                                             to the current working directory defined by "output".

  --passthroughCustomScalars                 Use your own types for custom scalars

  --queries=queries                          [default: **/*.graphql] Path to your GraphQL queries, can include search
                                             tokens like **

  --schema=schema                            Path to your GraphQL schema (.graphql, .json, .js, .ts)

  --tagName=tagName                          [default: gql] Name of the template literal tag used to identify template
                                             literals containing GraphQL queries in Javascript/Typescript code

  --target=target                            Type of code generator to use (swift | typescript | flow | scala), inferred
                                             from output

  --useFlowExactObjects                      Use Flow exact objects for generated types [flow only]

  --useFlowReadOnlyTypes                     Use Flow read only types for generated types [flow only]

  --watch                                    Watch the query files to auto-generate on changes.
```

_See code: [src/commands/codegen/generate.ts](https://github.com/apollographql/apollo-cli/blob/master/packages/apollo/src/commands/codegen/generate.ts)_

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

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v1.2.11/src/commands/help.ts)_

## `apollo queries:check`

Checks your GraphQL operations for compatibility with the server. Checks against the published schema in Apollo Engine.

```
USAGE
  $ apollo queries:check

OPTIONS
  -h, --help         Show command help
  --config=config    Path to your Apollo config file
  --json             Output result as JSON
  --key=key          The API key for the Apollo Engine service
  --queries=queries  Path to your GraphQL queries, can include search tokens like **

  --tagName=tagName  [default: gql] Name of the template literal tag used to identify template literals containing
                     GraphQL queries in Javascript/Typescript code
```

_See code: [src/commands/queries/check.ts](https://github.com/apollographql/apollo-cli/blob/master/packages/apollo/src/commands/queries/check.ts)_

## `apollo queries:extract OUTPUT`

Extracts queries

```
USAGE
  $ apollo queries:extract OUTPUT

ARGUMENTS
  OUTPUT  [default: manifest.json] Path to write the extracted queries to

OPTIONS
  -h, --help         Show command help
  --config=config    Path to your Apollo config file
  --key=key          The API key for the Apollo Engine service
  --queries=queries  Path to your GraphQL queries, can include search tokens like **

  --tagName=tagName  [default: gql] Name of the template literal tag used to identify template literals containing
                     GraphQL queries in Javascript/Typescript code
```

_See code: [src/commands/queries/extract.ts](https://github.com/apollographql/apollo-cli/blob/master/packages/apollo/src/commands/queries/extract.ts)_

## `apollo schema:check`

Check a schema against the version registered in Apollo Engine.

```
USAGE
  $ apollo schema:check

OPTIONS
  -h, --help           Show command help
  --config=config      Path to your Apollo config file
  --endpoint=endpoint  The URL of the server to fetch the schema from
  --header=header      Additional headers to send to server for introspectionQuery
  --json               Output result as JSON
  --key=key            The API key for the Apollo Engine service
```

_See code: [src/commands/schema/check.ts](https://github.com/apollographql/apollo-cli/blob/master/packages/apollo/src/commands/schema/check.ts)_

## `apollo schema:download OUTPUT`

Download the schema from your GraphQL endpoint.

```
USAGE
  $ apollo schema:download OUTPUT

ARGUMENTS
  OUTPUT  [default: schema.json] Path to write the introspection result to

OPTIONS
  -h, --help               Show command help
  -k, --skipSSLValidation  Allow connections to a SSL site without certs
  --config=config          Path to your Apollo config file
  --endpoint=endpoint      The URL of the server to fetch the schema from or path to ./your/local/schema.graphql
  --header=header          Additional headers to send to server for introspectionQuery
  --key=key                The API key for the Apollo Engine service
```

_See code: [src/commands/schema/download.ts](https://github.com/apollographql/apollo-cli/blob/master/packages/apollo/src/commands/schema/download.ts)_

## `apollo schema:publish`

Publish a schema to Apollo Engine

```
USAGE
  $ apollo schema:publish

OPTIONS
  -h, --help           Show command help
  --config=config      Path to your Apollo config file
  --endpoint=endpoint  The URL of the server to fetch the schema from
  --header=header      Additional headers to send to server for introspectionQuery
  --json               Output successful publish result as JSON
  --key=key            The API key for the Apollo Engine service
```

_See code: [src/commands/schema/publish.ts](https://github.com/apollographql/apollo-cli/blob/master/packages/apollo/src/commands/schema/publish.ts)_
<!-- commandsstop -->

# Configuration

The Apollo CLI and VS Code extension can be configured with an Apollo Config file. Apollo configuration is stored as a plain object and can be either specified under the `apollo` key in your `package.json` or as a separate `apollo.config.js` which exports the config data.

The core of any configuration is specifying schemas and queries. Schemas specify information about your backend such as where to get the schema, what endpoint to make requests against, and the Apollo Engine API key to get schema updates and stats from. Queries define which documents Apollo tooling should analyze and tie them to the schema they are targeting.

Let's take a look at a basic configuration file (`package.json` style):

```js
{
  ...
  "apollo": {
    "schemas": {
      "myPrimaryBackend": {
        "schema": "downloadedSchema.json", // if not defined the an introspection query will be run
        "endpoint": "http://example.com/graphql", // if not defined the schema will be downloaded from Apollo Engine
        "engineKey": "my-engine-key" // use this key when connecting to Apollo Engine
      }
    },
    "queries": [ // optional if you only have one schema
      {
        "schema": "myPrimaryBackend", // reference the previously defined schema
        "includes": [ "**/*.tsx" ], // load queries from .tsx files
        "excludes": [ "node_modules/**" ] // don't include any matching files from node_modules
      }
    ]
  }
}
```

Or in `apollo.config.js` style:

```js
...

module.exports = {
  schemas: {
    myPrimaryBackend: {
      schema: "downloadedSchema.json", // if not defined the an introspection query will be run
      endpoint: "http://example.com/graphql", // if not defined the schema will be downloaded from Apollo Engine
      engineKey: "my-engine-key" // use this key when connecting to Apollo Engine
    }
  },
  queries: [ // optional if you only have one schema
    {
      schema: "myPrimaryBackend", // reference the previously defined schema
      includes: [ "**/*.tsx" ], // load queries from .tsx files
      excludes: [ "node_modules/**" ] // don't include any matching files from node_modules
    }
  ]
}
```

## Endpoint Configuration

When configuring a schema's endpoint, you can either pass in a string or an object, which allows for specifying advanced options like headers and subscription endpoints.

```js
endpoint: {
  url: "http://example.com/graphql",
  subscriptions: "ws://example.com/graphql",
  headers: {
    cookie: "myCookie=myCookieValue"
  }
}
```

## Schema Dependencies

Schemas can also declare dependencies on eachother, which can be useful in situations like having a client-side schema for `apollo-link-state`. To declare a dependency, use the `extends` key. When working with a client-side schema, make sure to also specify the `clientSide` key to enable code-generation support.

```js
schemas: {
  myServerSideSchema: {
    ...
  },
  myClientSideSchema: {
    extends: "myServerSideSchema",
    clientSide: true
    ...
  }
}
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

[![Build Status](https://circleci.com/gh/apollographql/apollo-cli.svg?style=svg)](https://circleci.com/gh/apollographql/apollo-cli)

This repo is composed of multiple packages managed by Lerna. The `apollo-cli` contains the core CLI commands. The `apollo-codegen-core` package contains all the compiler APIs needed to implement code generation support for new languages. The other `apollo-codegen-*` packages implement code generation support for individual languages.

Running tests locally:

```
npm install
npm test
```

You can also run `npm` commands within package folders after you have bootstrapped the repository (part of `npm install`).

## Nock tests

To display the debugging messages for nock, run the following command:

```bash
DEBUG=nock.* npm test
```

It can also be helpful to print standard out during testing. To enable logging, add the following configuration to the `stdout` function call during test creation:

```
.stdout({ print: true })
```
