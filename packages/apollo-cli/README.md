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
$ npm install -g apollo-cli
$ apollo COMMAND
running command...
$ apollo (-v|--version|version)
apollo-cli/0.0.0 linux-x64 node-v9.4.0
$ apollo --help [COMMAND]
USAGE
  $ apollo COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [apollo hello [FILE]](#apollo-hello-file)
* [apollo help [COMMAND]](#apollo-help-command)

## apollo hello [FILE]

describe the command here

```
USAGE
  $ apollo hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ apollo hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/apollographql/apollo-cli/blob/v0.0.0/src/commands/hello.ts)_

## apollo help [COMMAND]

display help for apollo

```
USAGE
  $ apollo help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v1.2.10/src/commands/help.ts)_
<!-- commandsstop -->
