import gql from "graphql-tag";
import { buildServiceDefinition } from "../buildServiceDefinition";

describe("buildServiceDefinition", () => {
  it(`should include types from different modules`, () => {
    const service = buildServiceDefinition([
      gql`
        type User {
          name: String
        }
      `,
      gql`
        type Post {
          title: String
        }
      `
    ]);

    expect(service.errors).toBeUndefined();
  });

  it(`should not allow two types with the same name in the same module`, () => {
    const service = buildServiceDefinition([
      gql`
        type User {
          name: String
        }
      `,
      gql`
        type User {
          title: String
        }
      `
    ]);

    expect(service.errors).toMatchInlineSnapshot(`
Array [
  [GraphQLError: Type "User" was defined more than once.],
]
`);
  });

  it(`should not allow two types with the same name in different modules`, () => {
    const service = buildServiceDefinition([
      gql`
        type User {
          name: String
        }
      `,
      gql`
        type User {
          title: String
        }
      `
    ]);

    expect(service.errors).toMatchInlineSnapshot(`
Array [
  [GraphQLError: Type "User" was defined more than once.],
]
`);
  });

  it(`should report multiple errors`, () => {
    const service = buildServiceDefinition([
      gql`
        type User {
          name: String
        }
      `,
      gql`
        type User {
          title: String
        }
      `,
      gql`
        type Post {
          title: String
        }
      `,
      gql`
        type Post {
          name: String
        }
      `
    ]);

    expect(service.errors).toMatchInlineSnapshot(`
Array [
  [GraphQLError: Type "User" was defined more than once.],
  [GraphQLError: Type "Post" was defined more than once.],
]
`);
  });

  it(`should extend a type from the same module`, () => {
    const service = buildServiceDefinition([
      gql`
        type User {
          name: String
        }

        extend type User {
          email: String
        }
      `
    ]);

    expect(service.errors).toBeUndefined();

    expect(service.schema).toBeDefined();
    const schema = service.schema!;

    expect(schema.getType("User")).toMatchInlineSnapshot(`
type User {
  name: String
  email: String
}
`);
  });

  it(`should extend a type from a different module`, () => {
    const service = buildServiceDefinition([
      gql`
        type User {
          name: String
        }
      `,
      gql`
        extend type User {
          email: String
        }
      `
    ]);

    expect(service.errors).toBeUndefined();

    expect(service.schema).toBeDefined();
    const schema = service.schema!;

    expect(schema.getType("User")).toMatchInlineSnapshot(`
type User {
  name: String
  email: String
}
`);
  });

  it(`should report an error when extending a non-existent type`, () => {
    const service = buildServiceDefinition([
      gql`
        extend type User {
          email: String
        }
      `
    ]);

    expect(service.errors).toMatchInlineSnapshot(`
Array [
  [GraphQLError: Cannot extend type "User" because it does not exist in the existing schema.],
]
`);
  });

  it.skip(`should allow extending root types even if they aren't defined elsewhere`, () => {
    const service = buildServiceDefinition([
      gql`
        extend type Query {
          rootField: String
        }
      `
    ]);

    expect(service.errors).toBeUndefined();

    expect(service.schema).toBeDefined();
    const schema = service.schema!;

    expect(schema.getType("Query")).toMatchInlineSnapshot();
  });
});
