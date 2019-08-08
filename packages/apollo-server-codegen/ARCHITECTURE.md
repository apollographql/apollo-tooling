# Architecture

## Overview

The code generator is a set of modules designed to accept a GraphQL schema, and from it generate type definitions in TypeScript format (other languages may be supported in the future).

Similar to projects like [graphql code generator](https://graphql-code-generator.com), the generated type definitions describe both the type of the GraphQL objects represented in the schema, and the type of the `resolvers` function that an Apollo Server serving would require to serve the schema. However, this project expands upon existing efforts by providing accurate type definitions for federated schemas, built using the Apollo Federation platform.

This package serves only as an API, to interface with it we suggest the `Apollo CLI`, where it is available as `apollo server:codegen`.

## Design

The generator is built using a two-layered approach, where the frontend is able to convert an SDL-formatted input string to an internal representation (`IR`), and one or backends are able to convert that `IR` to files of type declaration source code in a particular programming language. Currently only a backend for TypeScript is provided.

The two layers interact via a [visitor pattern](https://en.wikipedia.org/wiki/Visitor_pattern) interface, which allows new backends to be created without any code change to the frontend. To add a new language backend, one must implement the [Translator](Translators/index.ts) interface for that language, which is a declaration of how each `IR` node (things like `IR.EnumDefinition`, `IR.UnionDefinition`, etc.), should be represented in a given target language. For example, the TypeScript implementation implements the `Translator` interface for `IR.Description` like so:

```ts
  public translateDescription(t: IR.Description): string {
    return [
      "/**",
      ...t.description.split("\n").map(line => `* ${line}`),
      " */"
    ].join("\n");
  }
```

Additionally, every node in the `IR` implements [`Translatable`](Translators/index.ts):

```ts
export interface Translatable {
  translate(t: Translator): string | undefined;
}
```

This allows a `Translator`'s translation to recursively descend into the `IR` tree by simply calling `.translate(this)` on each IR node.

### Generating IR

Internally, the IR generation phase is a fair amount more complicated than existing projects, like as `graphql code generator` might need to be. This is because with the introduction of the Apollo Federation directives, especially `@key`,`@provides`, and `@requires`, the type generation requires global type knowledge and thus cannot be completed in one pass. For instance, in the below SDL:

```gql
type Review @key(fields: "{creationDate author { id }}") {
  body: String!
  creationDate: String!
  author: User! @provides(fields: "username")
}

type Author {
  id: ID!
  username: String!
  email: String!
}
```

For the type of `Review`'s `key`:

```ts
type ReviewRepresentation = { creationDate: string; author: { id: string } };
```

to be created requires knowledge of the `Author` type, in particular that it's `id` field is type `string`.

To solve this problem, the `IR` generator, [`getSDLFromIR`](/IR/index.md), works in two phases: it first compiles the SDL into a "typeless" representation, where the only basic type knowledge needed for the later construction of federation-aware types is created. Then, it injects that basic global type knowledge back into itself, to form the final, federation-aware `IR`.

> Typically, `buildSchema` from `graphql-js` could be used to get the general type information, however in the case of Federation the SDL may be ill formed for `buildSchema` (undefined directives, extended classes that aren't otherwise defined, etc.), so that is not possible in this case.
