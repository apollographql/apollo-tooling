# Apollo client code generator

This is an early prototype of a tool to generate client code based on a GraphQL schema and query documents.

It currently generates Swift code for a subset of GraphQL queries. Most importantly, fragments are not yet supported. See [apollo-ios](https://github.com/apollostack/apollo-ios) for a more detailed description of the proposed mapping, as well as runtime support for performing queries.

## Usage

The tool has not yet been released on npm. For now, to try it out run `npm link` from the package root directory. This will install the `apollo-codegen` command globally.

To download a GraphQL schema by sending an introspection query to a server:

```sh
apollo-codegen download-schema http://localhost:3000/graphql --output GitHuntAPI/Definitions/schema.json
```

To generate Swift code from a set of query definitions in `.graphql` files:

```sh
apollo-codegen generate GitHuntAPI/Definitions/**/*.graphql --schema GitHuntAPI/Definitions/schema.json --output GitHuntAPI/Generated
```
