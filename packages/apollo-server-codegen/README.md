# Apollo Server Codegen

This package provides functionality for going from an SDL description of a service to type definitions for the resolvers of that service.

Currently, the only target language supported is TypeScript, but the project is designed to scale to other languages without too much work.

## Translation Strategy (TypeScript)

The main export of the generated file is the `Resolvers` type definition, which has two type parameters, `TContext` and `TInternalReps`. Both default to `{}`. If provided, `TContext` will be the type of the `context` parameter in resolvers. `TInternalReps` is helpful when your internal objects use fields not present in the graphql schema:

```gql
type User {
  me(token: String): String!
}
```

```ts
const resolvers: Resolvers<
  { datasources: MyAPI },
  { User: { internalID: string } }
> = {
  User: {
    // All these destructurings will typecheck as expected!
    name({ internalID }, { token }, { datasources }) {
      ...
    }
  }
};
```

If you use the `rootValue` configuration option in Apollo Server, the typing for the `parent` property of `Query` and `Mutation` can be passed similarly, by using `{ Query: { ... }, Mutation: { ... }, ... }` as `TInternalReps`.

## Nullability

Nullable fields generally use a `Nullable` wrapper, defined as `Nullable<T> = T | null | undefined`. This seems to work best for the real-world scenarios tested against, with the one exception that nullable arguments are simply treated as optional, as this allows for a better experience in TS when setting default values while destructuring.

### Objects

SDL object types are converted into two separate TS types. For instance, in the case of `type User`, the base `User` and a separate `UserRepresentation` will both be created.

The base type simply contains all the specified fields, nullable as appropriate, and is set as the return value of all functions that return that type in the SDL. As GraphQL functions may always return partials that will be recursively fulfilled by later resolvers, the base type definitions are also always `Partial`s.

The `[...]Representation` type defaults to `unknown` in non-federated contexts (see below for federation), and is passed as the `parent` property in resolver functions. If the user would like more type safety, they can pass an object to the second type parameter of the emitted `Resolvers` definition, specifying the object name, and the resolvers will have access to those properties when resolving values for that object:

```ts
const resolvers: Resolvers<TContext, { User: {internalID: number} }> {
  User: {
    name({ internalID }) => ... // id will be of type `number`
  }
}
```

Alternatively, if the user would like more type freedom, they can pass `any` to the second type parameter of the emitted `Resolvers` definition, and the resolvers will use `any` as the type of their `parent` argument:

```ts
const resolvers: Resolvers<TContext, any> {
  User: {
    name({ foo, bar }) => ... // this is allowed. `foo` and `bar` will be type `any`.
  }
}
```

### Scalars

Scalars are simply converted to type `any`, though if there is sufficient community demand, these could be specified in a manner similar to the `TInternalReps` strategy above.

### Enums

Enums are by default converted to a basic `or` of all their type options. It is possible to set the `__experimentalInternalEnumSupport` flag to remove type errors when using internal enum values, by simply treating enums as `any`. If there is sufficient community demand, these could be better typed in a manner similar to the `TInternalReps` strategy above.

### Federation Directives

#### @key

Objects with `@key` directives will be translated into resolvers with an additional `__resolveReference` field.

Fields specified as `@key`s will be provided in the `parent` parameter of the each field's resolver definition:

```gql
type Review @key(fields: "timestamp author { id }") @key(fields: "id") {
  author: User!
  id: ID!
  timestamp: Int!
}

type User @key(fields: "id") {
  id: ID!
  name: String!
}
```

```ts
{
  Review: {
    // `representation` is type `{timestamp: number, author: {id: number}} | {id: string}`
    __resolveReference(representation) {...}
  }
  User: {
    // `representation` is type `{id: string}`
    __resolveReference(representation) {...}
    // parent is also {id: string}
    name(parent) {}
  }
}
```

#### @external, @provides

Fields marked `@external` cannot have resolvers defined for them, unless they are also marked `@provided` by some other field:

```gql
type Review @key(...) {
  author: User @provides(fields: "name")
}

extend type User @key(fields: ID) {
  id: ID @external
  name: String @external
}
```

```ts
{
  User: {
    id() {...}  // Error
    name(parent) {...} // OK
  }
}
```

#### @requires

Fields with a `@requires` directive will have access to the given fields in their resolver functions:

```gql
extend type Product @key(fields: "upc") {
  upc: String! @external
  weight: Int! @external
  price: Int! @external
  inStock!: Boolean
  shippingEstimate: Int @requires(fields: "price weight")
}
```

```ts
Product: {
  // parent is {upc: string}
  inStock(parent) {...}
  // parent is {upc: string, price: number, weight: number}
  shippingEstimate(parent) {...}
}
```
