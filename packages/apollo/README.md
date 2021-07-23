# Apollo CLI

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollographql/apollo-tooling/master/LICENSE) [![npm](https://img.shields.io/npm/v/apollo.svg)](https://www.npmjs.com/package/apollo) [![Get on Slack](https://img.shields.io/badge/spectrum-join-orange.svg)](https://spectrum.chat/apollo?tab=posts)

> **Note:** Apollo's GraphQL VSCode extension is no longer housed in this repository. It is now maintained separately in [this repo](https://github.com/apollographql/vscode-graphql).

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
apollo/2.33.4 darwin-x64 node-v16.2.0
$ apollo --help [COMMAND]
USAGE
  $ apollo COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`apollo client:check`](#apollo-clientcheck)
* [`apollo client:codegen [OUTPUT]`](#apollo-clientcodegen-output)
* [`apollo client:download-schema OUTPUT`](#apollo-clientdownload-schema-output)
* [`apollo client:extract OUTPUT`](#apollo-clientextract-output)
* [`apollo client:push`](#apollo-clientpush)
* [`apollo help [COMMAND]`](#apollo-help-command)
* [`apollo plugins`](#apollo-plugins)
* [`apollo plugins:inspect PLUGIN...`](#apollo-pluginsinspect-plugin)
* [`apollo plugins:install PLUGIN...`](#apollo-pluginsinstall-plugin)
* [`apollo plugins:link PLUGIN`](#apollo-pluginslink-plugin)
* [`apollo plugins:uninstall PLUGIN...`](#apollo-pluginsuninstall-plugin)
* [`apollo plugins:update`](#apollo-pluginsupdate)
* [`apollo service:check`](#apollo-servicecheck)
* [`apollo service:delete`](#apollo-servicedelete)
* [`apollo service:download OUTPUT`](#apollo-servicedownload-output)
* [`apollo service:list`](#apollo-servicelist)
* [`apollo service:push`](#apollo-servicepush)

## `apollo client:check`

Check a client project against a pushed service

```
Check a client project against a pushed service

USAGE
  $ apollo client:check

OPTIONS
  -c, --config=config
      Path to your Apollo config file

  -g, --graph=graph
      The ID for the graph in Apollo to operate client commands with. 
      Overrides config file if set.

  -v, --variant=variant
      The variant of the graph in Apollo to associate this client to

  --clientName=clientName
      Name of the client that the queries will be attached to

  --clientReferenceId=clientReferenceId
      Reference id for the client which will match ids from client traces, 
      will use clientName if not provided

  --clientVersion=clientVersion
      The version of the client that the queries will be attached to

  --endpoint=endpoint
      The URL for the CLI use to introspect your service

  --excludes=excludes
      Glob of files to exclude for GraphQL operations. Caveat: this doesn't 
      currently work in watch mode

  --header=header
      Additional header to send during introspection. May be used multiple 
      times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED 
      if using the `--header` flag.

  --includes=includes
      Glob of files to search for GraphQL operations. This should be used to 
      find queries *and* any client schema extensions

  --key=key
      The API key to use for authentication to Apollo

  --queries=queries
      Deprecated in favor of the includes flag

  --tagName=tagName
      Name of the template literal tag used to identify template literals 
      containing GraphQL queries in Javascript/Typescript code
```

_See code: [src/commands/client/check.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/client/check.ts)_

## `apollo client:codegen [OUTPUT]`

Generate static types for GraphQL queries. Can use the published schema in the Apollo registry or a downloaded schema.

```
Generate static types for GraphQL queries. Can use the published schema in the Apollo registry or a downloaded schema.

USAGE
  $ apollo client:codegen [OUTPUT]

ARGUMENTS
  OUTPUT
      Directory to which generated files will be written.
      - For TypeScript/Flow generators, this specifies a directory relative 
      to each source file by default.
      - For TypeScript/Flow generators with the "outputFlat" flag is set, 
      and for the Swift generator, this specifies a file or directory 
      (absolute or relative to the current working directory) to which:
         - a file will be written for each query (if "output" is a 
      directory)
         - all generated types will be written
      - For all other types, this defines a file (absolute or relative to 
      the current working directory) to which all generated types are 
      written.

OPTIONS
  -c, --config=config
      Path to your Apollo config file

  -g, --graph=graph
      The ID for the graph in Apollo to operate client commands with. 
      Overrides config file if set.

  -v, --variant=variant
      The variant of the graph in Apollo to associate this client to

  --[no-]addTypename
      [default: true] Automatically add __typename to your queries, can be 
      unset with --no-addTypename

  --clientName=clientName
      Name of the client that the queries will be attached to

  --clientReferenceId=clientReferenceId
      Reference id for the client which will match ids from client traces, 
      will use clientName if not provided

  --clientVersion=clientVersion
      The version of the client that the queries will be attached to

  --customScalarsPrefix=customScalarsPrefix
      Include a prefix when using provided types for custom scalars

  --endpoint=endpoint
      The URL for the CLI use to introspect your service

  --excludes=excludes
      Glob of files to exclude for GraphQL operations. Caveat: this doesn't 
      currently work in watch mode

  --globalTypesFile=globalTypesFile
      By default, TypeScript will put a file named "globalTypes.ts" inside 
      the "output" directory. Set "globalTypesFile" to specify a different 
      path. Alternatively, set "tsFileExtension" to modify the extension of 
      the file, for example "d.ts" will output "globalTypes.d.ts"

  --header=header
      Additional header to send during introspection. May be used multiple 
      times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED 
      if using the `--header` flag.

  --includes=includes
      Glob of files to search for GraphQL operations. This should be used to 
      find queries *and* any client schema extensions

  --key=key
      The API key to use for authentication to Apollo

  --localSchemaFile=localSchemaFile
      Path to one or more local GraphQL schema file(s), as introspection 
      result or SDL. Supports comma-separated list of paths (ex. 
      `--localSchemaFile=schema.graphql,extensions.graphql`)

  --mergeInFieldsFromFragmentSpreads
      Merge fragment fields onto its enclosing type

  --namespace=namespace
      The namespace to emit generated code into.

  --omitDeprecatedEnumCases
      Omit deprecated enum cases from generated code [Swift only]

  --only=only
      Parse all input files, but only output generated code for the 
      specified file [Swift only]

  --operationIdsPath=operationIdsPath
      Path to an operation id JSON map file. If specified, also stores the 
      operation ids (hashes) as properties on operation types [currently 
      Swift-only]

  --outputFlat
      By default, TypeScript/Flow will put each generated file in a 
      directory next to its source file using the value of the "output" as 
      the directory name. Set "outputFlat" to put all generated files in the 
      directory relative to the current working directory defined by 
      "output".

  --passthroughCustomScalars
      Use your own types for custom scalars

  --queries=queries
      Deprecated in favor of the includes flag

  --suppressSwiftMultilineStringLiterals
      Prevents operations from being rendered as multiline strings [Swift 
      only]

  --tagName=tagName
      Name of the template literal tag used to identify template literals 
      containing GraphQL queries in Javascript/Typescript code

  --target=target
      (required) Type of code generator to use (swift | typescript | flow | 
      scala | json | json-modern (exposes raw json types))

  --tsFileExtension=tsFileExtension
      By default, TypeScript will output "ts" files. Set "tsFileExtension" 
      to specify a different file extension, for example "d.ts"

  --useFlowExactObjects
      Use Flow exact objects for generated types [flow only]

  --useFlowReadOnlyTypes
      Use read only types for generated types [flow only]. **Deprecated in 
      favor of `useReadOnlyTypes`.**

  --useReadOnlyTypes
      Use read only types for generated types [flow | typescript]

  --watch
      Watch for file changes and reload codegen

ALIASES
  $ apollo codegen:generate
```

_See code: [src/commands/client/codegen.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/client/codegen.ts)_

## `apollo client:download-schema OUTPUT`

Download a schema from Apollo or a GraphQL endpoint in JSON or SDL format

```
Download a schema from Apollo or a GraphQL endpoint in JSON or SDL format

USAGE
  $ apollo client:download-schema OUTPUT

ARGUMENTS
  OUTPUT  [default: schema.json] Path to write the introspection result
          to. Can be `.graphql`, `.gql`, `.graphqls`, or `.json`

OPTIONS
  -c, --config=config
      Path to your Apollo config file

  -g, --graph=graph
      The ID for the graph in Apollo to operate client commands with. 
      Overrides config file if set.

  -v, --variant=variant
      The variant of the graph in Apollo to associate this client to

  --clientName=clientName
      Name of the client that the queries will be attached to

  --clientReferenceId=clientReferenceId
      Reference id for the client which will match ids from client traces, 
      will use clientName if not provided

  --clientVersion=clientVersion
      The version of the client that the queries will be attached to

  --endpoint=endpoint
      The URL for the CLI use to introspect your service

  --excludes=excludes
      Glob of files to exclude for GraphQL operations. Caveat: this doesn't 
      currently work in watch mode

  --header=header
      Additional header to send during introspection. May be used multiple 
      times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED 
      if using the `--header` flag.

  --includes=includes
      Glob of files to search for GraphQL operations. This should be used to 
      find queries *and* any client schema extensions

  --key=key
      The API key to use for authentication to Apollo

  --queries=queries
      Deprecated in favor of the includes flag

  --tagName=tagName
      Name of the template literal tag used to identify template literals 
      containing GraphQL queries in Javascript/Typescript code
```

_See code: [src/commands/client/download-schema.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/client/download-schema.ts)_

## `apollo client:extract OUTPUT`

Extract queries from a client

```
Extract queries from a client

USAGE
  $ apollo client:extract OUTPUT

ARGUMENTS
  OUTPUT  [default: manifest.json] Path to write the extracted queries to

OPTIONS
  -c, --config=config
      Path to your Apollo config file

  -g, --graph=graph
      The ID for the graph in Apollo to operate client commands with. 
      Overrides config file if set.

  -v, --variant=variant
      The variant of the graph in Apollo to associate this client to

  --clientName=clientName
      Name of the client that the queries will be attached to

  --clientReferenceId=clientReferenceId
      Reference id for the client which will match ids from client traces, 
      will use clientName if not provided

  --clientVersion=clientVersion
      The version of the client that the queries will be attached to

  --endpoint=endpoint
      The URL for the CLI use to introspect your service

  --excludes=excludes
      Glob of files to exclude for GraphQL operations. Caveat: this doesn't 
      currently work in watch mode

  --header=header
      Additional header to send during introspection. May be used multiple 
      times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED 
      if using the `--header` flag.

  --includes=includes
      Glob of files to search for GraphQL operations. This should be used to 
      find queries *and* any client schema extensions

  --key=key
      The API key to use for authentication to Apollo

  --preserveStringAndNumericLiterals
      Disable redaction of string and numerical literals.  Without this 
      flag, these values will be replaced with empty strings (`''`) and 
      zeroes (`0`) respectively.  This redaction is intended to avoid  
      inadvertently outputting potentially personally identifiable 
      information (e.g. embedded passwords  or API keys) into operation 
      manifests

  --queries=queries
      Deprecated in favor of the includes flag

  --tagName=tagName
      Name of the template literal tag used to identify template literals 
      containing GraphQL queries in Javascript/Typescript code
```

_See code: [src/commands/client/extract.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/client/extract.ts)_

## `apollo client:push`

Register operations with Apollo, adding them to the safelist

```
Register operations with Apollo, adding them to the safelist

USAGE
  $ apollo client:push

OPTIONS
  -c, --config=config
      Path to your Apollo config file

  -g, --graph=graph
      The ID for the graph in Apollo to operate client commands with. 
      Overrides config file if set.

  -v, --variant=variant
      The variant of the graph in Apollo to associate this client to

  --clientName=clientName
      Name of the client that the queries will be attached to

  --clientReferenceId=clientReferenceId
      Reference id for the client which will match ids from client traces, 
      will use clientName if not provided

  --clientVersion=clientVersion
      The version of the client that the queries will be attached to

  --endpoint=endpoint
      The URL for the CLI use to introspect your service

  --excludes=excludes
      Glob of files to exclude for GraphQL operations. Caveat: this doesn't 
      currently work in watch mode

  --header=header
      Additional header to send during introspection. May be used multiple 
      times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED 
      if using the `--header` flag.

  --includes=includes
      Glob of files to search for GraphQL operations. This should be used to 
      find queries *and* any client schema extensions

  --key=key
      The API key to use for authentication to Apollo

  --queries=queries
      Deprecated in favor of the includes flag

  --tagName=tagName
      Name of the template literal tag used to identify template literals 
      containing GraphQL queries in Javascript/Typescript code
```

_See code: [src/commands/client/push.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/client/push.ts)_

## `apollo help [COMMAND]`

display help for apollo

```
display help for <%= config.bin %>

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
list installed plugins

USAGE
  $ apollo plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ apollo plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/index.ts)_

## `apollo plugins:inspect PLUGIN...`

displays installation properties of a plugin

```
displays installation properties of a plugin

USAGE
  $ apollo plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] plugin to inspect

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

EXAMPLE
  $ apollo plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/inspect.ts)_

## `apollo plugins:install PLUGIN...`

installs a plugin into the CLI

```
installs a plugin into the CLI
Can be installed from npm or a git url.

Installation of a user-installed plugin will override a core plugin.

e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in the CLI without the need to patch and update the whole CLI.


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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/install.ts)_

## `apollo plugins:link PLUGIN`

links a plugin into the CLI for development

```
links a plugin into the CLI for development
Installation of a linked plugin will override a user-installed or core plugin.

e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello' command will override the user-installed or core plugin implementation. This is useful for development work.


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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/link.ts)_

## `apollo plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
removes a plugin from the CLI

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

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/uninstall.ts)_

## `apollo plugins:update`

update installed plugins

```
update installed plugins

USAGE
  $ apollo plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.10.0/src/commands/plugins/update.ts)_

## `apollo service:check`

[DEPRECATED] Check a service against known operation workloads to find breaking changes

```
[DEPRECATED] Check a service against known operation workloads to find breaking changes
-----------------------------------------------------------------
DEPRECATED: This command will be removed from the `apollo` CLI in 
its next major version. Replacement functionality is available in 
the new Apollo Rover CLI: https://go.apollo.dev/t/migration
-----------------------------------------------------------------


USAGE
  $ apollo service:check

OPTIONS
  -c, --config=config
      Path to your Apollo config file

  -g, --graph=graph
      The ID of the graph in Apollo to check your proposed schema changes 
      against. Overrides config file if set.

  -v, --variant=variant
      The variant to check the proposed schema against

  --author=author
      The author to associate with this proposed schema

  --branch=branch
      The branch name to associate with this check

  --commitId=commitId
      The SHA-1 hash of the commit to associate with this check

  --endpoint=endpoint
      The URL for the CLI use to introspect your service

  --header=header
      Additional header to send during introspection. May be used multiple 
      times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED 
      if using the `--header` flag.

  --ignoreFailures
      Exit with status 0 when the check completes, even if errors are found

  --json
      Output result in json, which can then be parsed by CLI tools such as 
      jq.

  --key=key
      The API key to use for authentication to Apollo

  --localSchemaFile=localSchemaFile
      Path to one or more local GraphQL schema file(s), as introspection 
      result or SDL. Supports comma-separated list of paths (ex. 
      `--localSchemaFile=schema.graphql,extensions.graphql`)

  --markdown
      Output result in markdown.

  --queryCountThreshold=queryCountThreshold
      Minimum number of requests within the requested time window for a 
      query to be considered.

  --queryCountThresholdPercentage=queryCountThresholdPercentage
      Number of requests within the requested time window for a query to be 
      considered, relative to total request count. Expected values are 
      between 0 and 0.05 (minimum 5% of total request volume)

  --serviceName=serviceName
      Provides the name of the implementing service for a federated graph. 
      This flag will indicate that the schema is a partial schema from a 
      federated service

  --validationPeriod=validationPeriod
      The size of the time window with which to validate the schema against. 
      You may provide a number (in seconds), or an ISO8601 format duration 
      for more granularity (see: 
      https://en.wikipedia.org/wiki/ISO_8601#Durations)

DESCRIPTION
  -----------------------------------------------------------------
  DEPRECATED: This command will be removed from the `apollo` CLI in 
  its next major version. Replacement functionality is available in 
  the new Apollo Rover CLI: https://go.apollo.dev/t/migration
  -----------------------------------------------------------------

ALIASES
  $ apollo schema:check
```

_See code: [src/commands/service/check.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/service/check.ts)_

## `apollo service:delete`

[DEPRECATED] Delete a federated service from Apollo and recompose remaining services

```
[DEPRECATED] Delete a federated service from Apollo and recompose remaining services
-----------------------------------------------------------------
DEPRECATED: This command will be removed from the `apollo` CLI in 
its next major version. Replacement functionality is available in 
the new Apollo Rover CLI: https://go.apollo.dev/t/migration
-----------------------------------------------------------------


USAGE
  $ apollo service:delete

OPTIONS
  -c, --config=config        Path to your Apollo config file

  -g, --graph=graph          The ID of the graph in Apollo for which to
                             delete an implementing service. Overrides
                             config file if set.

  -v, --variant=variant      The variant to delete the implementing
                             service from

  -y, --yes                  Bypass confirmation when deleting a service

  --endpoint=endpoint        The URL for the CLI use to introspect your
                             service

  --header=header            Additional header to send during
                             introspection. May be used multiple times to
                             add multiple headers. NOTE: The `--endpoint`
                             flag is REQUIRED if using the `--header`
                             flag.

  --key=key                  The API key to use for authentication to
                             Apollo

  --serviceName=serviceName  (required) Provides the name of the
                             implementing service for a federated graph

DESCRIPTION
  -----------------------------------------------------------------
  DEPRECATED: This command will be removed from the `apollo` CLI in 
  its next major version. Replacement functionality is available in 
  the new Apollo Rover CLI: https://go.apollo.dev/t/migration
  -----------------------------------------------------------------
```

_See code: [src/commands/service/delete.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/service/delete.ts)_

## `apollo service:download OUTPUT`

[DEPRECATED] Download the schema from your GraphQL endpoint.

```
[DEPRECATED] Download the schema from your GraphQL endpoint.
-----------------------------------------------------------------
DEPRECATED: This command will be removed from the `apollo` CLI in 
its next major version. Replacement functionality is available in 
the new Apollo Rover CLI: https://go.apollo.dev/t/migration
-----------------------------------------------------------------


USAGE
  $ apollo service:download OUTPUT

ARGUMENTS
  OUTPUT  [default: schema.json] Path to write the introspection result
          to. Supports .json output only.

OPTIONS
  -c, --config=config      Path to your Apollo config file

  -g, --graph=graph        The ID of the graph in the Apollo registry for
                           which to download the schema for. Overrides
                           config file if provided.

  -k, --skipSSLValidation  Allow connections to an SSL site without certs

  -v, --variant=variant    The variant to download the schema of

  --endpoint=endpoint      The URL for the CLI use to introspect your
                           service

  --header=header          Additional header to send during introspection.
                           May be used multiple times to add multiple
                           headers. NOTE: The `--endpoint` flag is
                           REQUIRED if using the `--header` flag.

  --key=key                The API key to use for authentication to Apollo

DESCRIPTION
  -----------------------------------------------------------------
  DEPRECATED: This command will be removed from the `apollo` CLI in 
  its next major version. Replacement functionality is available in 
  the new Apollo Rover CLI: https://go.apollo.dev/t/migration
  -----------------------------------------------------------------

ALIASES
  $ apollo schema:download
```

_See code: [src/commands/service/download.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/service/download.ts)_

## `apollo service:list`

[DEPRECATED] List the services in a graph

```
[DEPRECATED] List the services in a graph
-----------------------------------------------------------------
DEPRECATED: This command will be removed from the `apollo` CLI in 
its next major version. Replacement functionality is available in 
the new Apollo Rover CLI: https://go.apollo.dev/t/migration
-----------------------------------------------------------------


USAGE
  $ apollo service:list

OPTIONS
  -c, --config=config    Path to your Apollo config file

  -g, --graph=graph      The ID of the graph in the Apollo registry for
                         which to list implementing services. Overrides
                         config file if set.

  -v, --variant=variant  The variant to list implementing services for

  --endpoint=endpoint    The URL for the CLI use to introspect your
                         service

  --header=header        Additional header to send during introspection.
                         May be used multiple times to add multiple
                         headers. NOTE: The `--endpoint` flag is REQUIRED
                         if using the `--header` flag.

  --key=key              The API key to use for authentication to Apollo

DESCRIPTION
  -----------------------------------------------------------------
  DEPRECATED: This command will be removed from the `apollo` CLI in 
  its next major version. Replacement functionality is available in 
  the new Apollo Rover CLI: https://go.apollo.dev/t/migration
  -----------------------------------------------------------------
```

_See code: [src/commands/service/list.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/service/list.ts)_

## `apollo service:push`

[DEPRECATED] Push a service definition to Apollo

```
[DEPRECATED] Push a service definition to Apollo
-----------------------------------------------------------------
DEPRECATED: This command will be removed from the `apollo` CLI in 
its next major version. Replacement functionality is available in 
the new Apollo Rover CLI: https://go.apollo.dev/t/migration
-----------------------------------------------------------------


USAGE
  $ apollo service:push

OPTIONS
  -c, --config=config
      Path to your Apollo config file

  -g, --graph=graph
      The ID of the graph in Apollo to publish your service to. Overrides 
      config file if set.

  -v, --variant=variant
      The variant to publish your service to in Apollo

  --author=author
      The author to associate with this publication

  --branch=branch
      The branch name to associate with this publication

  --commitId=commitId
      The SHA-1 hash of the commit to associate with this publication

  --endpoint=endpoint
      The URL for the CLI use to introspect your service

  --header=header
      Additional header to send during introspection. May be used multiple 
      times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED 
      if using the `--header` flag.

  --key=key
      The API key to use for authentication to Apollo

  --localSchemaFile=localSchemaFile
      Path to one or more local GraphQL schema file(s), as introspection 
      result or SDL. Supports comma-separated list of paths (ex. 
      `--localSchemaFile=schema.graphql,extensions.graphql`)

  --serviceName=serviceName
      Provides the name of the implementing service for a federated graph

  --serviceRevision=serviceRevision
      Provides a unique revision identifier for a change to an implementing 
      service on a federated service push. The default of this is a git sha

  --serviceURL=serviceURL
      Provides the url to the location of the implementing service for a 
      federated graph

DESCRIPTION
  -----------------------------------------------------------------
  DEPRECATED: This command will be removed from the `apollo` CLI in 
  its next major version. Replacement functionality is available in 
  the new Apollo Rover CLI: https://go.apollo.dev/t/migration
  -----------------------------------------------------------------

ALIASES
  $ apollo schema:publish
```

_See code: [src/commands/service/push.ts](https://github.com/apollographql/apollo-tooling/blob/master/packages/apollo/src/commands/service/push.ts)_
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
   - IMPORTANT: If publishing a prerelease (like `alpha`/`beta`/`rc`), set the tag that NPM will use to publish with the `APOLLO_DIST_TAG` environment variable. By default, if this isn't set, NPM will publish the prerelease to the `latest` tag (which isn't what we'd want).
   - Pushes a `publish/XXXXXXXXXX` tag to GitHub to trigger circle CI build
4. Circle will notify the appropriate Apollo team slack channel when ready to release
   - Slack channel member will confirm through the Apollo Deploy Bot
   - Circle will release to all channels (npm, cli binary to s3, vscode marketplace)
   - Another slack bot notification will confirm success of release.

## Maintainers

- [@JakeDawkins](https://github.com/jakedawkins) (Apollo)
