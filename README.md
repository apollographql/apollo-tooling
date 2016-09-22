# Apollo client code generator

This is a tool to generate client code based on a GraphQL schema and query documents.

It currently only generates Swift code, and only for a subset of GraphQL queries. Most importantly, fragments are only supported if their type condition matches their parent type exactly. See [Apollo iOS](https://github.com/apollostack/apollo-ios) for details on the proposed mapping from GraphQL results to Swift types, as well as runtime support for performing queries.

## Getting Started

[Apollo iOS Quickstart](https://github.com/apollostack/apollo-ios-quickstart) is a sample Xcode project that makes it easy to get started with a generated API for your own schema and queries.

## Usage

If you want to experiment with the tool, you can install the `apollo-codegen` command globally:

```sh
npm install apollo-codegen -g
```

To download a GraphQL schema by sending an introspection query to a server:

```sh
apollo-codegen download-schema http://localhost:8080/graphql --output GitHuntAPI/Definitions/schema.json
```

You can use the `header` option to add additional HTTP headers to the request. For example, to include an authentication token, use `--header "Authorization: Bearer <token>"`.

To generate Swift code from a set of query definitions in `.graphql` files:

```sh
apollo-codegen generate GitHuntAPI/Definitions/**/*.graphql --schema GitHuntAPI/Definitions/schema.json --output GitHuntAPI/GitHuntAPI.swift
```
