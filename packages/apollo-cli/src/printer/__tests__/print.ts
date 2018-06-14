import * as fs from "fs";
import * as path from "path";
import { buildSchema, parse } from "graphql";
const gql = String.raw;

import { printFromSchemas, printChanges } from "../print";
import { diffSchemas } from "../diff";

const initial = fs.readFileSync(
  path.join(
    __dirname,
    "../../commands/schema/__tests__/fixtures/schema.graphql"
  ),
  { encoding: "utf8" }
);
const change = fs.readFileSync(
  path.join(__dirname, "../../commands/schema/__tests__/fixtures/next.graphql"),
  { encoding: "utf8" }
);

const schemas = (sd1, sd2) => ({
  current: buildSchema(sd1),
  next: buildSchema(sd2),
});

const compare = (name, sd1, sd2, debug = false) => {
  it(name, () => {
    const { current, next } = schemas(sd1, sd2);
    const sdl = printFromSchemas(current, next);
    if (debug) console.log("DEBUG\n" + sdl);
    if (!debug) expect(sdl).toMatchSnapshot();
  });
};

const fcompare = (name, sd1, sd2, debug = true) => {
  fit(name, () => {
    const { current, next } = schemas(sd1, sd2);
    const sdl = printFromSchemas(current, next);
    if (debug) console.log("DEBUG\n" + sdl);
    if (!debug) expect(sdl).toMatchSnapshot();
  });
};

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

  compare(
    "shows removed types",
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

  compare(
    "shows added types",
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
});
describe("fields", () => {
  compare(
    "shows warning for removals",
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
  compare(
    "shows notice for additions",
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
});

describe("arguments", () => {
  compare(
    "shows removed arguments",
    gql`
      type Query {
        hello(name: String): String
      }

      interface Node {
        id(id: ID!): String
      }
    `,
    gql`
      type Query {
        hello: String
      }

      interface Node {
        id: String
      }
    `
  );
  compare(
    "shows added arguments",
    gql`
      type Query {
        hello: String
      }

      interface Node {
        id: String
      }
    `,
    gql`
      type Query {
        hello(name: String): String
      }

      interface Node {
        id(id: ID!): String
      }
    `
  );
});

describe("interfaces", () => {
  compare(
    "reports removal of interface implementations",
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      type User implements Node {
        id: ID!
      }
    `,
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      type User {
        id: ID!
      }
    `
  );
  compare(
    "reports removal multiple of interface implementations",
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      interface Person {
        id: ID!
      }

      type User implements Node & Person {
        id: ID!
      }
    `,
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      interface Person {
        id: ID!
      }

      type User implements Node {
        id: ID!
      }
    `
  );
  compare(
    "reports additiong of interface to object",
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      type User {
        id: ID!
      }
    `,
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      type User implements Node {
        id: ID!
      }
    `
  );

  compare(
    "reports adding multiple interface implementations",
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      interface Person {
        id: ID!
      }

      type User implements Node {
        id: ID!
      }
    `,
    gql`
      type Query {
        user(id: ID!): User
      }

      interface Node {
        id: ID!
      }

      interface Person {
        id: ID!
      }

      type User implements Node & Person {
        id: ID!
      }
    `
  );
});

describe("unions", () => {
  compare(
    "type removed from union",
    gql`
      type User {
        id: ID!
      }

      type Person {
        firstName: String
      }

      union Client = User | Person
    `,
    gql`
      type User {
        id: ID!
      }

      type Person {
        firstName: String
      }

      union Client = User
    `
  );
  compare(
    "type added from union",
    gql`
      type User {
        id: ID!
      }

      type Person {
        firstName: String
      }

      union Client = User
    `,
    gql`
      type User {
        id: ID!
      }

      type Person {
        firstName: String
      }

      union Client = User | Person
    `
  );
});

describe("kind changes", () => {
  compare(
    "type changed kind",
    gql`
      type Query {
        hello: String
      }

      interface ChangeType {
        id: ID!
      }
    `,
    gql`
      type Query {
        hello: String
      }

      type ChangeType {
        id: ID!
      }
    `
  );
  compare(
    "field changed kind",
    gql`
      type Query {
        hello: String
      }

      input Hello {
        hello: String
      }
    `,
    gql`
      type Query {
        hello: ID!
      }

      input Hello {
        hello: String!
      }
    `
  );
  compare(
    "arg changed kind",
    gql`
      type Query {
        hello(id: ID): String
        defaultVal(id: String = "1"): String
      }
    `,
    gql`
      type Query {
        hello(id: String): String
        defaultVal(id: String = "2"): String
      }
    `
  );
});

describe("deprecation changes", () => {
  compare(
    "deprecation additions",
    gql`
      type Query {
        deprecated: String
        deprecatedWithReason: String @deprecated(reason: "Give up")
      }

      enum SoLong {
        TWO
        ONE @deprecated(reason: "There can only be one highlander")
      }
    `,
    gql`
      type Query {
        deprecated: String @deprecated
        deprecatedWithReason: String
          @deprecated(reason: "Use field testcase instead")
      }

      enum SoLong {
        TWO @deprecated
        ONE @deprecated(reason: "One is the loneliest number")
      }
    `
  );
  compare(
    "deprecation removals",
    gql`
      type Query {
        deprecated: String @deprecated
      }

      enum SoLong {
        TWO @deprecated
      }
    `,
    gql`
      type Query {
        deprecated: String
      }

      enum SoLong {
        TWO
      }
    `
  );
});

// // Post Apollo Day goals
// DIRECTIVE_REMOVED,
// DIRECTIVE_LOCATION_REMOVED,
// DIRECTIVE_ARG_REMOVED,
// NON_NULL_DIRECTIVE_ARG_ADDED,

describe("integration", () => {
  // XXX make this change complex
  it("reports changes for a complex scenario", () => {
    const { current, next } = schemas(initial, change);
    const changes = diffSchemas(current.getTypeMap(), next.getTypeMap());
    const sdl = printChanges(changes);
    expect(sdl).toMatchSnapshot();
  });
});
