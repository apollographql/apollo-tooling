import { buildSchema, parse } from "graphql";
const gql = String.raw;

import { printFromSchemas } from "../print";

const schemas = (sd1, sd2) => ({
  current: buildSchema(sd1),
  next: buildSchema(sd2)
});

describe("types", () => {
  it("renders nothing for no changes", () => {
    const { current, next } = schemas(
      gql`
        type User {
          id: ID!
        }
      `,
      gql`
        type User {
          id: ID!
        }
      `
    );
    const sdl = printFromSchemas(current, next);
    expect(sdl).toBeFalsy();
  });

  it("shows removed types", () => {
    const { current, next } = schemas(
      gql`
        type RemovedType {
          id: ID!
        }

        enum RemovedEnum {
          ONE
        }

        input RemovedInput {
          id: ID!
        }

        scalar RemovedScalar

        interface RemovedInterface {
          id: ID!
        }

        union RemovedUnion = User

        type User {
          id: ID!
        }

      `,
      gql`
        type User {
          id: ID!
        }
      `
    );
    const sdl = printFromSchemas(current, next);
    expect(sdl).toMatchSnapshot();
  });

  it("shows added types", () => {
    const { current, next } = schemas(
      gql`
        type User {
          id: ID!
        }
      `,
      gql`
        type AddedType {
          id: ID!
        }

        enum AddedEnum {
          ONE
        }

        input AddedInput {
          id: ID!
        }

        scalar AddedScalar

        interface AddedInterface {
          id: ID!
        }

        union AddedUnion = User

        type User {
          id: ID!
        }

      `
    );
    const sdl = printFromSchemas(current, next);
    expect(sdl).toMatchSnapshot();
  });
});
describe("fields", () => {
  it("shows warning for removals", () => {
    const { current, next } = schemas(
      gql`
        type User {
          id: ID!
          firstName: String!
        }

        enum AddedEnum {
          ONE
          TWO
        }

        input AddedInput {
          id: ID!
          firstName: String!
          lastName: String
        }

        interface AddedInterface {
          id: ID!
          firstName(arg: String): String
        }

      `,
      gql`
        type User {
          id: ID!
        }

        enum AddedEnum {
          ONE
        }

        input AddedInput {
          id: ID!
        }

        interface AddedInterface {
          id: ID!
        }

      `
    );
    const sdl = printFromSchemas(current, next);

    expect(sdl).toMatchSnapshot();
  });
  it("shows notice for additions", () => {
    const { current, next } = schemas(
      gql`
        type User {
          id: ID!
        }

        enum AddedEnum {
          ONE
        }

        input AddedInput {
          id: ID!
        }

        interface AddedInterface {
          id: ID!
        }

      `,
      gql`
        type User {
          id: ID!
          firstName: String!
        }

        enum AddedEnum {
          ONE
          TWO
        }

        input AddedInput {
          id: ID!
          firstName: String!
          lastName: String
        }

        interface AddedInterface {
          id: ID!
          firstName(arg: String): String
        }

      `
    );
    const sdl = printFromSchemas(current, next);
    expect(sdl).toMatchSnapshot();
  });
});
