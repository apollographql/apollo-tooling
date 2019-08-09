# Apollo Server Codegen

This package provides functionality for going from an SDL description of a service to type definitions for the resolvers of that service.

Currently, the only target language supported is TypeScript, but the project is designed to scale to other languages without too much work.

## Translation Strategy (TypeScript)

The main export of the generated file is the `Resolvers` type definition, which has a `TOptions` type parameter which defaults to `{}`. It accepts four (optional) top level fields:

- `Context`: This type is used as the `context` argument for all resolvers.
- `InternalReps`: If you know a type in your schema will have a particular field internally, you can specify it here: `InternalReps: { User: { internalID: ID!}}`
- `Enums`: Declare any [Internal Enum Values](https://www.apollographql.com/docs/graphql-tools/scalars/#internal-values) you use here.
- `Scalars`: Declare the internal type of any [Custom Scalars](https://www.apollographql.com/docs/graphql-tools/scalars/#custom-scalars) you use here.

In short:

```gql
enum Color {
  RED
  GREEN
}

scalar Location

type User {
  whereAmI(token: String, favColor: Color): Location!
}
```

```ts
const resolvers: Resolvers<{
  Context: { datasources: MyAPI };
  InternalReps: { User: { internalID: string } };
  Enums: { Color: "#0f0" | "#f00" };
  Scalars: { Location: { lat: number; long: number } };
}> = {
  User: {
    // All these destructurings will typecheck as expected!
    // favColor is type '#0f0' | '#f00'
    whereAmI({ internalID }, { token, favColor }, { datasources }) {
      return { lat: 0, long: 0 };
    }
  },
  Location: {...},
  Color: {RED: "#f00", GREEN: "#0f0"},
};
```

If you use the `rootValue` configuration option in Apollo Server, the typing for the `parent` property of `Query` and `Mutation` can be passed similarly, by using `{ Query: { ... }, Mutation: { ... }, ... }` as `InternalReps`.

## Nullability

Nullable fields generally use a `Nullable` wrapper, defined as `Nullable<T> = T | null | undefined`. This seems to work best for the real-world scenarios tested against, with the one exception that nullable arguments are simply treated as optional, as this allows for a better experience in TS when setting default values while destructuring.

### Objects

SDL object types are converted into two separate TS types. For instance, in the case of `type User`, the base `User` and a separate `UserRepresentation` will both be created.

The base type simply contains all the specified fields, nullable as appropriate, and is set as the return value of all functions that return that type in the SDL. As GraphQL functions may always return partials that will be recursively fulfilled by later resolvers, the base type definitions are also always `Partial`s.

The `[...]Representation` type defaults to `unknown` in non-federated contexts (see below for federation), and is passed as the `parent` property in resolver functions. If the user would like more type safety, they can pass an object to the second type parameter of the emitted `Resolvers` definition, specifying the object name, and the resolvers will have access to those properties when resolving values for that object:

```ts
const resolvers: Resolvers<{InternalReps: { User: {internalID: number} }}> {
  User: {
    name({ internalID }) => ... // id will be of type `number`
  }
}
```

Alternatively, if the user would like more type freedom, they can pass `any` to the second type parameter of the emitted `Resolvers` definition, and the resolvers will use `any` as the type of their `parent` argument:

```ts
const resolvers: Resolvers<{InternalReps: any}> { // or {InternalReps: {User: any}}
  User: {
    name({ foo, bar }) => ... // this is allowed. `foo` and `bar` will be type `any`.
  }
}
```

### Scalars

Custom scalars can be used by declaring their internal type in the `Scalars` field of the resolver config object:

```gql
scalar JWT

type Query {
  me(token: JWT): User
}
```

```ts
const resolvers: Resolvers<{Scalars: {JWT: {header: {alg: string, type: string}}}> = {
  Query: {
    me(_, {header}) {
      if (header.type === "HS256") {
        // ...
      }
    }
  }
}
```

> You will still need to create your own implementation of the actual [`GraphQlScalarType`](https://graphql.org/graphql-js/type/#graphqlscalartype) object.

If no declaration for a scalar type is provided in the options, it will default to `unknown`.

### Enums

Enums are by default converted to a basic `or` of all their type options. If you are using [Internal Enum Values](), you can specify the possible internal values in the `Enums` field of the options object:

```gql
enum AllowedColor {
  RED
  GREEN
  BLUE
}

type Query {
  favoriteColor: AllowedColor
}
```

```ts
const resolvers: Resolvers<{Enums: {AllowedColor: '#f00' | '#0f0' | '#00f'}> = {
  Query: {
    favoriteColor(_) {
      return 'RED' // err: 'RED' is not assignable to type "'#f00' | '#0f0' | '#00f'"
    }
  },
  AllowedColor: {
    RED: '#f00'
    GREEN: '#0f0'
    BLUE: '#0000ff' // err: '#0000ff' is not assignable to type "'#f00' | '#0f0' | '#00f'"
  }
}
```

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

Fields marked `@external` cannot have resolvers defined for them, unless they are also marked `@provides` by some other field:

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
