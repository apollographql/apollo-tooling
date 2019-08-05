import { translate } from "..";
import { typeCheck } from "./codegen-test-utils";

// Warning: jest@<24.9.0 is has messed up matchInlineSnapshot such that any time a snapshot is updated, all the others will drift over
// Keep an eye out for drift before committing.

describe("typescript - federated schemas", () => {
  describe("@key", () => {
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
  });

  describe("@external", () => {
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
          "Type '() => number' is not assignable to type 'undefined'.The expected type comes from property 'numberOfReviews' which is declared here on type 'UserResolver<{}, {}, {}>'",
        ]
      `);
    });
  });

  describe("@required", () => {
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
  });

  describe("@provides", () => {
    it("translates @provides as a field set", async () => {
      const typeDefs = `#graphql

      extend type User @key(fields: "id") {
        id: ID! @external
        name: String! @external
        age: Int! @external
      }

      extend type Author @key(fields: "id") @key(fields: "person { id }") {
        id: ID! @external
        person: User! @external
        writings: [Review!]! @external
      }

      extend type Review {
        author: Author! @provides(fields: "id person { name }")
      }
    `;

      const resolvers = `const r: Resolvers = {
      User: {
        age: () => 0, // err
        name: () => '' // no err (provided)
      },
      Author: {
        id: () => '', // no err (provided)
        person: () => ({id: ''}) // no err (provided)
      },
      Review: {
        author: () => ({id: ''})
      }
    }`;

      const diagnostics = await typeCheck(typeDefs, resolvers);
      expect(diagnostics).toMatchInlineSnapshot(`
        Array [
          "Type '{ age: () => number; name: () => string; }' is not assignable to type 'UserResolver<{}, {}, {}>'.Types of property 'age' are incompatible.Type '() => number' is not assignable to type 'undefined'.The expected type comes from property 'User' which is declared here on type 'Resolvers<{}, {}, {}>'",
        ]
      `);
    });
  });
});
