import gql from "graphql-tag";
import { translate } from "..";
import { typeCheck } from "./codegen-test-utils";

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

  it("translates @key directives into Representations and __resolveReference", async () => {
    const typeDefs = `#graphql
      type Review @key(fields: "id") {
        id: ID!
        body: String
        author: String
      }
    `;
    const resolvers = `const r: ReviewResolver = { __resolveReference({ id }) { let a: number = id; return {} } }`;
    const diagnostics = await typeCheck(typeDefs, resolvers);
    expect(diagnostics).toMatchInlineSnapshot(`
      Array [
        "Type 'string' is not assignable to type 'number'.",
      ]
    `);
  });

  it("translates multiple @key directives into an OR of types", async () => {
    const typeDefs = `#graphql
      type Review @key(fields: "id body") @key(fields: "author") {
        id: ID!
        body: String
        author: String
      }
    `;

    const resolvers = `const r: ReviewResolver = { __resolveReference(rep) { rep.id; rep.author; return {}} }`;
    const diagnostics = await typeCheck(typeDefs, resolvers);
    expect(diagnostics).toMatchInlineSnapshot(`
      Array [
        "Property 'id' does not exist on type '{ id: string; body: string | null | undefined; } | { author: string | null | undefined; }'.Property 'id' does not exist on type '{ author: string | null | undefined; }'.",
        "Property 'author' does not exist on type '{ id: string; body: string | null | undefined; } | { author: string | null | undefined; }'.Property 'author' does not exist on type '{ id: string; body: string | null | undefined; }'.",
      ]
    `);
  });

  it("does not generate resolver definitions for @external types, unless they are @provide'd", async () => {
    const typeDefs = `#graphql
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
    const resolvers = `const r: UserResolver = { numberOfReviews: () => 5, username: () => 'hello' }`;
    const diagnostics = await typeCheck(typeDefs, resolvers);
    expect(diagnostics).toMatchInlineSnapshot(`
      Array [
        "Type '() => number' is not assignable to type 'undefined'.The expected type comes from property 'numberOfReviews' which is declared here on type 'UserResolver<{}, {}>'",
      ]
    `);
  });

  it("Places @require'd members on the resolver's working object", async () => {
    const typeDefs = `#graphql
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

    const resolvers = `const r: ProductResolver = {shippingEstimate: ({sku, size, weight, missing}) => ''}`;
    const diagnostics = await typeCheck(typeDefs, resolvers);
    expect(diagnostics).toMatchInlineSnapshot(`
      Array [
        "Property 'missing' does not exist on type '{ sku: string; } & { size: number | null | undefined; weight: number | null | undefined; }'.",
      ]
    `);
  });

  const r = {
    favoriteColor() {
      return "PINK";
    },
    avatar(_, { borderColor }) {
      let a: "PINK" = borderColor;
      return "";
    }
  };

  it("translates enums", async () => {
    const typeDefs = `#graphql
      type Query {
        favoriteColor: AllowedColor # As a return value
        avatar(borderColor: AllowedColor): AllowedColor # As an argument
      }

      enum AllowedColor {
        RED
        GREEN
        BLUE
      }
    `;
    const resolvers = `const r: QueryResolver = {favoriteColor() {return 'RED'}, avatar(_, {borderColor}) { let a: 'PINK' = borderColor; return a } }`;
    const diagnostics = await typeCheck(typeDefs, resolvers);
    expect(diagnostics).toMatchInlineSnapshot(`
      Array [
        "Type '(_: any, { borderColor }: { borderColor?: \\"RED\\" | \\"GREEN\\" | \\"BLUE\\" | undefined; }) => \\"PINK\\"' is not assignable to type '(parent: any, args: { borderColor?: \\"RED\\" | \\"GREEN\\" | \\"BLUE\\" | undefined; }, context: {}, info: any) => PromiseOrValue<Nullable<AllowedColor>>'.Type '\\"PINK\\"' is not assignable to type 'PromiseOrValue<Nullable<AllowedColor>>'.The expected type comes from property 'avatar' which is declared here on type 'QueryResolver<{}, {}>'",
        "Type '\\"RED\\" | \\"GREEN\\" | \\"BLUE\\" | undefined' is not assignable to type '\\"PINK\\"'.Type 'undefined' is not assignable to type '\\"PINK\\"'.",
      ]
    `);
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
});
