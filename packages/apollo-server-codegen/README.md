# Apollo Server Codegen

This package provides functionality for going from an SDL description of a service to type definitions for the resolvers of that service.

Currently, the only target language supported is TypeScript, but the project is designed to scale to other languages without too much work.

## Translation Strategy (TypeScript)

### Objects

SDL object types are converted into two separate TS types, the base, `User`, and a separate `UserRepresentation`.

The `Representation` type defaults to `any` in non-federated contexts, and is passed as the `parent` property in resolver functions. If the user would like more type safety, they can pass an object to the second type parameter of the emitted `Resolvers` definition, specifying the object name, and the internal representation resolvers will have access to when filling values for that object:

```ts
const resolvers: Resolvers<{}, User: {internalID: number}> {
  User: {
    name({ internalID }) => ... // id will be of type `number`
  }
}
```

### Scalars

Scalars are simply converted to type `any`, though if there is sufficient community demand, these could be specified in a manner similar to the "_internalRepresentation_ type parameter" strategy above.

### Enums

Enums are by default converted to a basic `or` of all their type options. It is possible to set the `__experimentalInternalEnumSupport` flag to remove type errors when using internal enum values, by simply treating enums as `any`. If there is sufficient community demand, these could be better typed in a manner similar to the "_internalRepresentation_ type parameter" strategy above.

### Federation Directives

#### @key

Objects with `@key` directives will be translated into resolvers with an additional `__resolveReference` field.

Fields specified as `@key`s will be provided in the `parent` parameter of the each field's resolver definition:

```gql
type Review @key(fields: "timestamp author { id }") @key(fields: "id") {
  author: User
  id: ID
  timestamp: Int
}

type User @key(fields: "id") {
  id: ID
  name: String
}
```

```ts
{
  Review: {
    // representation is type `{timestamp: number, author: {id: number}} | {id: string}`
    __resolveReference(representation) {...}
  }
  User: {
    // representation is type `{id: string}`
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
  weight: Int @external
  price: Int @external
  inStock: Boolean
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
