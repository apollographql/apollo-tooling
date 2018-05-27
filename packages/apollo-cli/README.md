apollo-cli
==========

CLI for the Apollo platform of tooling

[![Version](https://img.shields.io/npm/v/apollo-cli.svg)](https://npmjs.org/package/apollo-cli)
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
$ npm install -g @apollographql/cli
$ apollo COMMAND
running command...
$ apollo (-v|--version|version)
@apollographql/cli/1.0.0-canary.0 linux-x64 node-v9.4.0
$ apollo --help [COMMAND]
USAGE
  $ apollo COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`apollo help [COMMAND]`](#apollo-help-command)
* [`apollo schema [FILE]`](#apollo-schema-file)
* [`apollo schema:check`](#apollo-schemacheck)
* [`apollo schema:publish`](#apollo-schemapublish)

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

## `apollo schema [FILE]`

describe the command here

```
USAGE
  $ apollo schema [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print
```

_See code: [src/commands/schema.ts](https://github.com/apollographql/apollo-cli/blob/v1.0.0-canary.0/src/commands/schema.ts)_

## `apollo schema:check`

Check a schema against previous registered schema

```
USAGE
  $ apollo schema:check

OPTIONS
  -e, --endpoint=endpoint  [default: http://localhost:4000/graphql] The location of the server to from which to fetch
                           the schema

  -h, --help               show CLI help

  -s, --service=service    ENGINE_API_KEY for the Engine service

  --header=header          Additional headers to send to server for introspectionQuery

  --json                   output result as json
```

_See code: [src/commands/schema/check.ts](https://github.com/apollographql/apollo-cli/blob/v1.0.0-canary.0/src/commands/schema/check.ts)_

## `apollo schema:publish`

Publish a schema to Engine

```
USAGE
  $ apollo schema:publish

OPTIONS
  -e, --endpoint=endpoint  [default: http://localhost:4000/graphql] The location of the server to from which to fetch
                           the schema

  -h, --help               show CLI help

  -s, --service=service    ENGINE_API_KEY for the Engine service

  --header=header          Additional headers to send to server for introspectionQuery

  --json                   output successful publish result as json
```

_See code: [src/commands/schema/publish.ts](https://github.com/apollographql/apollo-cli/blob/v1.0.0-canary.0/src/commands/schema/publish.ts)_
<!-- commandsstop -->
