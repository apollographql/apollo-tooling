# Apollo GraphQL code generator

[![GitHub license](https://img.shields.io/badge/license-MIT-lightgrey.svg?maxAge=2592000)](https://raw.githubusercontent.com/apollostack/apollo-ios/master/LICENSE) [![npm](https://img.shields.io/npm/v/apollo-codegen.svg)](https://www.npmjs.com/package/apollo-codegen) [![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

This is a tool to generate API code or type annotations based on a GraphQL schema and query documents.

It currently generates Swift code, TypeScript annotations and Flow annotations, we hope to add support for other targets in the future.

See [Apollo iOS](https://github.com/apollostack/apollo-ios) for details on the mapping from GraphQL results to Swift types, as well as runtime support for executing queries and mutations.

## Usage

If you want to experiment with the tool, you can install the `apollo-codegen` command globally:

```sh
npm install -g apollo-codegen
```

To download a GraphQL schema by sending an introspection query to a server:

```sh
apollo-codegen download-schema http://localhost:8080/graphql --output schema.json
```

You can use the `header` option to add additional HTTP headers to the request. For example, to include an authentication token, use `--header "Authorization: Bearer <token>"`.

This tool will generate Swift code by default from a set of query definitions in `.graphql` files:

```sh
apollo-codegen generate **/*.graphql --schema schema.json --output API.swift
```

You can also generate type annotations for TypeScript or Flow using the `--target` option:

```sh
# TypeScript
apollo-codegen generate **/*.graphql --schema schema.json --target typescript --output schema.ts
# Flow
apollo-codegen generate **/*.graphql --schema schema.json --target flow --output schema.flow.js
```

## Contributing

[![Build status](https://travis-ci.org/apollostack/apollo-codegen.svg?branch=master)](https://travis-ci.org/apollostack/apollo-codegen)

Running tests locally:

```
npm install
npm test
```
