import gql from "graphql-tag";
import { translate } from "..";

// Warning: jest@<24.9.0 is has messed up matchInlineSnapshot such that any time a snapshot is updated, all the others will drift over
// Keep an eye out for drift before committing.

describe("translating to typescript", () => {
  it("translates basic object types", () => {
    const typeDefs = gql`
      type Query {
        me: User
      }

      type User {
        firstName: String
        lastName: String!
        age: Int
      }
    `;

    expect(translate(typeDefs, "ts")).toMatchInlineSnapshot(`
      "// This is a machine generated file.
      // Use \\"apollo service:codegen\\" to regenerate.
      type PromiseOrValue<T> = Promise<T> | T
      type Nullable<T> = T | null | undefined
      type Index<Map extends Record<string, any>, Key extends string, IfMissing> = Map[Key] extends object ? Map[Key] : IfMissing

      export interface Resolvers<TContext = {}, TInternalReps = {}> {
        Query: QueryResolver<TContext, TInternalReps>
        User?: UserResolver<TContext, TInternalReps>
      }

      type QueryRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, \\"Query\\", any>
      export interface QueryResolver<TContext = {}, TInternalReps = {}> {
      me: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<User>>

      }

      type UserRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, \\"User\\", any>
      export interface User {
      firstName?: Nullable<string>
      lastName?: string
      age?: Nullable<number>

      }
      export interface UserResolver<TContext = {}, TInternalReps = {}> {
      firstName?: (parent: UserRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<string>>
      lastName?: (parent: UserRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<string>
      age?: (parent: UserRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<number>>

      }


      "
    `);
  });

  it("translates nonnulls and lists into ts equivalent", () => {
    const typeDefs = gql`
      type Query {
        base: Int
        nonNull: Int!
        list: [Int]
        nonNullList: [Int]!
        listNonNull: [Int!]
        nonNullListNonNull: [Int!]!
      }
    `;
    expect(translate(typeDefs, "ts")).toMatchInlineSnapshot(`
      "// This is a machine generated file.
      // Use \\"apollo service:codegen\\" to regenerate.
      type PromiseOrValue<T> = Promise<T> | T
      type Nullable<T> = T | null | undefined
      type Index<Map extends Record<string, any>, Key extends string, IfMissing> = Map[Key] extends object ? Map[Key] : IfMissing

      export interface Resolvers<TContext = {}, TInternalReps = {}> {
        Query: QueryResolver<TContext, TInternalReps>
      }

      type QueryRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, \\"Query\\", any>
      export interface QueryResolver<TContext = {}, TInternalReps = {}> {
      base: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<number>>
      nonNull: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<number>
      list: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<Array<Nullable<number>>>>
      nonNullList: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Array<Nullable<number>>>
      listNonNull: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Nullable<Array<number>>>
      nonNullListNonNull: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<Array<number>>

      }


      "
    `);
  });

  it("translates descriptions into TSDoc", () => {
    const typeDefs = gql`
      """
      This it the base type
      """
      type Query {
        """
        Current User
        """
        me(
          """
          Authorization
          """
          token: String
          """
          Also auth
          """
          other: String
        ): String
      }
    `;
    expect(translate(typeDefs, "ts")).toMatchInlineSnapshot(`
      "// This is a machine generated file.
      // Use \\"apollo service:codegen\\" to regenerate.
      type PromiseOrValue<T> = Promise<T> | T
      type Nullable<T> = T | null | undefined
      type Index<Map extends Record<string, any>, Key extends string, IfMissing> = Map[Key] extends object ? Map[Key] : IfMissing

      export interface Resolvers<TContext = {}, TInternalReps = {}> {
        Query: QueryResolver<TContext, TInternalReps>
      }

      type QueryRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, \\"Query\\", any>
      /**
       * This it the base type
       */
      export interface QueryResolver<TContext = {}, TInternalReps = {}> {
      /**
       * Current User
       */
      me: (parent: QueryRepresentation<TInternalReps>, args: {
      /**
       * Authorization
       */
      token?: string
      /**
       * Also auth
       */
      other?: string
      }, context: TContext, info: any) => PromiseOrValue<Nullable<string>>

      }


      "
    `);
  });

  it("translates @key directives into Representations and __resolveReference", () => {
    const typeDefs = gql`
      type Review @key(fields: "id") {
        id: ID!
        body: String
        author: String
        product: Product
      }
    `;

    const typings = translate(typeDefs, "ts");
    expect(typings).toEqual(
      expect.stringContaining(
        'type ReviewRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, "Review", {}> & ({ id: string, })'
      )
    );
    expect(typings).toEqual(
      expect.stringContaining(
        "__resolveReference?: (parent: ReviewRepresentation<"
      )
    );
  });

  it("translates multiple @key directives into an OR of types", () => {
    const typeDefs = gql`
      type Review @key(fields: "id body") @key(fields: "body") {
        id: ID!
        body: String
        author: String
        product: Product
      }
    `;
    const typings = translate(typeDefs, "ts");
    expect(typings).toEqual(
      expect.stringContaining(
        'type ReviewRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, "Review", {}> & ({ id: string, body: Nullable<string>, } | { body: Nullable<string>, })'
      )
    );
  });

  it("does not generate __resolveReferences for an extended type", () => {
    const typeDefs = gql`
      extend type User @key(fields: "id") {
        id: ID @external
        numberOfReviews: Int!
      }
    `;

    const typings = translate(typeDefs, "ts");
    expect(typings).not.toEqual(expect.stringContaining("__resolveReferences"));
  });

  it("does not generate resolver definitions for @external types, unless they are @provide'd", () => {
    const typeDefs = gql`
      type Review @key(fields: "id") {
        id: ID!
        body: String
        author: User @provides(fields: "username")
      }

      extend type User @key(fields: "id") {
        id: ID @external
        username: String @external
        numberOfReviews: Int! @external
      }
    `;
    const typings = translate(typeDefs, "ts");
    expect(typings).toEqual(
      expect.stringContaining("username?: (parent: UserRepresentation")
    );
    expect(typings).toEqual(expect.stringContaining("numberOfReviews: never"));
  });

  it("Places @require'd members on the resolver's working object", () => {
    const typeDefs = gql`
      type Review @key(fields: "id") @key(fields: "id author { id username }") {
        id: ID!
        body: String
        author: User
        product: Product
      }

      extend type User @key(fields: "id username") {
        id: ID @external
        username: String @external
        numberOfReviews: Int!
        reviews: [Review]
      }

      extend type Product @key(fields: "sku") {
        sku: ID! @external
        size: Int @external
        weight: Int @external
        shippingEstimate: String @requires(fields: "size weight")
      }
    `;

    expect(translate(typeDefs, "ts")).toEqual(
      expect.stringContaining(
        "shippingEstimate?: (parent: ProductRepresentation<TInternalReps> & { size: Nullable<number>, weight: Nullable<number>, },"
      )
    );
  });

  it("translates enums", () => {
    const typeDefs = gql`
      type Query {
        favoriteColor: AllowedColor # As a return value
        avatar(borderColor: AllowedColor): String # As an argument
      }

      enum AllowedColor {
        RED
        GREEN
        BLUE
      }
    `;

    const typings = translate(typeDefs, "ts");

    expect(typings).toEqual(
      expect.stringContaining(
        `export type AllowedColor = "RED" | "GREEN" | "BLUE"`
      )
    );
    expect(typings).toEqual(
      expect.stringContaining(`=> PromiseOrValue<Nullable<AllowedColor>>`)
    );
    expect(typings).toEqual(
      expect.stringContaining(`borderColor?: AllowedColor`)
    );
  });

  it("translates enums to `any` when __experimentalInternalEnum support is enabled", () => {
    const typeDefs = gql`
      type Query {
        favoriteColor: AllowedColor # As a return value
        avatar(borderColor: AllowedColor): String # As an argument
      }

      enum AllowedColor {
        RED
        GREEN
        BLUE
      }
    `;

    const typings = translate(typeDefs, "ts", {
      __experimentalInternalEnumValueSupport: true
    });

    expect(typings).toEqual(
      expect.stringContaining("export type AllowedColor = any")
    );
    expect(typings).toEqual(
      expect.stringContaining(
        `export type AllowedColorExternal = "RED" | "GREEN" | "BLUE"`
      )
    );
    expect(typings).toEqual(
      expect.stringContaining(
        `AllowedColor: { [external: AllowedColorExternal]: any }`
      )
    );
    expect(typings).toEqual(
      expect.stringContaining(`borderColor?: AllowedColor`)
    );
    expect(typings).toEqual(
      expect.stringContaining(` => PromiseOrValue<Nullable<AllowedColor>>`)
    );
  });

  it("translates custom scalars", () => {
    const typeDefs = gql`
      scalar JSON

      type Query {
        me(auth: JSON): JSON
      }
    `;

    const typings = translate(typeDefs, "ts");

    expect(typings).toEqual(expect.stringContaining("JSON: any"));
    expect(typings).toEqual(expect.stringContaining("export type JSON = any"));
    expect(typings).toEqual(expect.stringContaining("auth?: JSON"));
    expect(typings).toEqual(
      expect.stringContaining("=> PromiseOrValue<Nullable<JSON>>")
    );
  });

  it("translates strings as well as document nodes", () => {
    const typeDefs = `
      type Query {
        me: String!
      }
    `;

    const typings = translate(typeDefs, "ts");

    expect(typings).toMatchInlineSnapshot(`
      "// This is a machine generated file.
      // Use \\"apollo service:codegen\\" to regenerate.
      type PromiseOrValue<T> = Promise<T> | T
      type Nullable<T> = T | null | undefined
      type Index<Map extends Record<string, any>, Key extends string, IfMissing> = Map[Key] extends object ? Map[Key] : IfMissing

      export interface Resolvers<TContext = {}, TInternalReps = {}> {
        Query: QueryResolver<TContext, TInternalReps>
      }

      type QueryRepresentation<TInternalReps extends Record<string, any>> = Index<TInternalReps, \\"Query\\", any>
      export interface QueryResolver<TContext = {}, TInternalReps = {}> {
      me: (parent: QueryRepresentation<TInternalReps>, args: {}, context: TContext, info: any) => PromiseOrValue<string>

      }


      "
    `);
  });
});
