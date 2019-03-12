import gql from "graphql-tag";
import { buildSchemaFromModules } from "../buildSchemaFromSDL";

import astSerializer from "./snapshotSerializers/astSerializer";
import graphQLTypeSerializer from "./snapshotSerializers/graphQLTypeSerializer";
import selectionSetSerializer from "./snapshotSerializers/selectionSetSerializer";

import { GraphQLObjectType } from "graphql";

expect.addSnapshotSerializer(astSerializer);
expect.addSnapshotSerializer(graphQLTypeSerializer);
expect.addSnapshotSerializer(selectionSetSerializer);

describe("buildSchemaFromModules", () => {
  describe(`resolvers`, () => {
    it(`should add a resolver for a field`, () => {
      const name = () => {};

      const schema = buildSchemaFromModules([
        {
          typeDefs: gql`
            type User {
              name: String
            }
          `,
          resolvers: {
            User: {
              name
            }
          }
        }
      ]);

      const userType = schema.getType("User");
      expect(userType).toBeDefined();

      const nameField = (userType! as GraphQLObjectType).getFields()["name"];
      expect(nameField).toBeDefined();

      expect(nameField.resolve).toEqual(name);
    });
  });
});
