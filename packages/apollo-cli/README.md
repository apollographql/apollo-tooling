apollo-cli
==========

CLI for the Apollo platform of tooling

[![Version](https://img.shields.io/npm/v/apollo.svg)](https://npmjs.org/package/apollo)
[![CircleCI](https://circleci.com/gh/apollographql/apollo-cli/tree/master.svg?style=shield)](https://circleci.com/gh/apollographql/apollo-cli/tree/master)
[![Appveyor CI](https://ci.appveyor.com/api/projects/status/github/apollographql/apollo-cli?branch=master&svg=true)](https://ci.appveyor.com/project/apollographql/apollo-cli/branch/master)
[![Codecov](https://codecov.io/gh/apollographql/apollo-cli/branch/master/graph/badge.svg)](https://codecov.io/gh/apollographql/apollo-cli)
[![Downloads/week](https://img.shields.io/npm/dw/apollo-cli.svg)](https://npmjs.org/package/apollo-cli)
[![License](https://img.shields.io/npm/l/apollo-cli.svg)](https://github.com/apollographql/apollo-cli/blob/master/package.json)

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g apollo
$ apollo COMMAND
running command...
$ apollo (-v|--version|version)
apollo/1.1.1 darwin-x64 node-v10.4.1
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
* [`apollo schema:check`](#apollo-schemacheck)
* [`apollo schema:checkQueries`](#apollo-schemacheck-queries)
* [`apollo schema:download OUTPUT`](#apollo-schemadownload-output)
* [`apollo schema:publish`](#apollo-schemapublish)

## `apollo codegen:generate [OUTPUT]`

Generate static types for GraphQL queries.

```
USAGE
  $ apollo codegen:generate [OUTPUT]

ARGUMENTS
  OUTPUT  Path to write the generated code to

OPTIONS
  -h, --help                                 Show command help
  --addTypename                              Automatically add __typename to your queries
  --customScalarsPrefix=customScalarsPrefix  Include a prefix when using provided types for custom scalars
  --key=key                                  The API key for the Apollo Engine service
  --mergeInFieldsFromFragmentSpreads         Merge fragment fields onto its enclosing type
  --namespace=namespace                      The namespace to emit generated code into.

  --only=only                                Parse all input files, but only output generated code for the specified
                                             file [Swift only]

  --operationIdsPath=operationIdsPath        Path to an operation id JSON map file. If specified, also stores the
                                             operation ids (hashes) as properties on operation types [currently
                                             Swift-only]

  --passthroughCustomScalars                 Use your own types for custom scalars

  --queries=queries                          [default: **/*.graphql] Path to your GraphQL queries, can include search
                                             tokens like **

  --schema=schema                            Path to your GraphQL schema introspection result

  --tagName=tagName                          [default: gql] Name of the template literal tag used to identify template
                                             literals containing GraphQL queries in Javascript/Typescript code

  --target=target                            Type of code generator to use (swift | typescript | flow | scala), inferred
                                             from output

  --useFlowExactObjects                      Use Flow read only types for generated types [flow only]

  --useFlowReadOnlyTypes                     Use Flow read only types for generated types [flow only]
```

_See code: [src/commands/codegen/generate.ts](https://github.com/apollographql/apollo-cli/blob/v1.1.1/src/commands/codegen/generate.ts)_

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

## `apollo schema:check`

Check a schema against the version registered in Apollo Engine.

```
USAGE
  $ apollo schema:check

OPTIONS
  -h, --help           Show command help
  --endpoint=endpoint  [default: http://localhost:4000/graphql] The URL of the server to fetch the schema from
  --header=header      Additional headers to send to server for introspectionQuery
  --json               Output result as JSON
  --key=key            The API key for the Apollo Engine service
```

_See code: [src/commands/schema/check.ts](https://github.com/apollographql/apollo-cli/blob/v1.1.1/src/commands/schema/check.ts)_

## `apollo schema:checkQueries`

Generate static types for GraphQL queries.

```
USAGE
  $ apollo schema:checkQueries

OPTIONS
  -h, --help         Show command help
  --key=key          The API key for the Apollo Engine service
  --queries=queries  [default: **/*.graphql] Path to your GraphQL queries, can include search tokens like **
  --schema=schema    Path to your GraphQL schema introspection result

  --tagName=tagName  [default: gql] Name of the template literal tag used to identify template literals containing
                     GraphQL queries in Javascript/Typescript code
```

_See code: [src/commands/schema/checkQueries.ts](https://github.com/apollographql/apollo-cli/blob/v1.1.1/src/commands/schema/checkQueries.ts)_

## `apollo schema:download OUTPUT`

Download the schema from your GraphQL endpoint.

```
USAGE
  $ apollo schema:download OUTPUT

ARGUMENTS
  OUTPUT  [default: schema.json] Path to write the introspection result to

OPTIONS
  -h, --help           Show command help
  --endpoint=endpoint  [default: http://localhost:4000/graphql] The URL of the server to fetch the schema from
  --header=header      Additional headers to send to server for introspectionQuery
  --key=key            The API key for the Apollo Engine service
```

_See code: [src/commands/schema/download.ts](https://github.com/apollographql/apollo-cli/blob/v1.1.1/src/commands/schema/download.ts)_

## `apollo schema:publish`

Publish a schema to Apollo Engine

```
USAGE
  $ apollo schema:publish

OPTIONS
  -h, --help           Show command help
  --endpoint=endpoint  [default: http://localhost:4000/graphql] The URL of the server to fetch the schema from
  --header=header      Additional headers to send to server for introspectionQuery
  --json               Output successful publish result as JSON
  --key=key            The API key for the Apollo Engine service
```

_See code: [src/commands/schema/publish.ts](https://github.com/apollographql/apollo-cli/blob/v1.1.1/src/commands/schema/publish.ts)_
<!-- commandsstop -->
