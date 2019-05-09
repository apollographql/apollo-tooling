import gql from "graphql-tag";
import { buildSchemaFromSDL } from "../buildSchemaFromSDL";
import {
  GraphQLSchema,
  GraphQLDirective,
  DirectiveLocation,
  GraphQLObjectType
} from "graphql";

import astSerializer from "./snapshotSerializers/astSerializer";
import graphQLTypeSerializer from "./snapshotSerializers/graphQLTypeSerializer";
import selectionSetSerializer from "./snapshotSerializers/selectionSetSerializer";

expect.addSnapshotSerializer(astSerializer);
expect.addSnapshotSerializer(graphQLTypeSerializer);
expect.addSnapshotSerializer(selectionSetSerializer);

describe("buildSchemaFromSDL", () => {
  describe(`type definitions`, () => {
    it(`should construct types from definitions`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          type User {
            name: String
          }

          type Post {
            title: String
          }
        `
      );

      expect(schema.getType("User")).toMatchInlineSnapshot(`
type User {
  name: String
}
`);

      expect(schema.getType("Post")).toMatchInlineSnapshot(`
type Post {
  title: String
}
`);
    });

    it(`should not allow multiple type definitions with the same name`, () => {
      expect(() =>
        buildSchemaFromSDL(
          gql`
            type User {
              name: String
            }

            type User {
              title: String
            }
          `
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"There can be only one type named \\"User\\"."`
      );
    });
  });

  describe(`type extension`, () => {
    it(`should allow extending a type defined in the same document`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          type User {
            name: String
          }

          extend type User {
            email: String
          }
        `
      );

      expect(schema.getType("User")).toMatchInlineSnapshot(`
type User {
  name: String
  email: String
}
`);
    });

    it(`should allow extending a non-existent type`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          extend type User {
            email: String
          }
        `
      );

      expect(schema.getType("User")).toMatchInlineSnapshot(`
type User {
  email: String
}
`);
    });

    it.skip(`should report an error when extending a non-existent type`, () => {
      expect(() =>
        buildSchemaFromSDL(
          gql`
            extend type User {
              email: String
            }
          `
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Cannot extend type \\"User\\" because it is not defined."`
      );
    });
  });

  describe(`root operation types`, () => {
    it(`should include a root type with a default type name`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          type Query {
            rootField: String
          }
        `
      );

      expect(schema.getType("Query")).toMatchInlineSnapshot(`
type Query {
  rootField: String
}
`);

      expect(schema.getQueryType()).toEqual(schema.getType("Query"));
    });

    it(`should include a root type with a non-default type name`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          schema {
            query: Query
          }

          type Query {
            rootField: String
          }
        `
      );

      expect(schema.getType("Query")).toMatchInlineSnapshot(`
type Query {
  rootField: String
}
`);

      expect(schema.getQueryType()).toEqual(schema.getType("Query"));
    });

    it(`should include a root type with a non-default type name specified in a schema extension`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          extend schema {
            query: Query
          }

          type Query {
            rootField: String
          }
        `
      );

      expect(schema.getType("Query")).toMatchInlineSnapshot(`
type Query {
  rootField: String
}
`);

      expect(schema.getQueryType()).toEqual(schema.getType("Query"));
    });

    describe(`extending root operation types that aren't defined elsewhere`, () => {
      it(`should be allowed`, () => {
        const schema = buildSchemaFromSDL(
          gql`
            extend type Query {
              rootField: String
            }
          `
        );

        expect(schema.getType("Query")).toMatchInlineSnapshot(`
type Query {
  rootField: String
}
`);
        expect(schema.getQueryType()).toEqual(schema.getType("Query"));
      });

      it(`should be allowed with a non-default type name`, () => {
        const schema = buildSchemaFromSDL(
          gql`
            schema {
              query: QueryRoot
            }
            extend type QueryRoot {
              rootField: String
            }
          `
        );

        expect(schema.getType("QueryRoot")).toMatchInlineSnapshot(`
type QueryRoot {
  rootField: String
}
`);
        expect(schema.getQueryType()).toEqual(schema.getType("QueryRoot"));
      });

      it(`should be allowed with a non-default name specified in a schema extension`, () => {
        const schema = buildSchemaFromSDL(
          gql`
            schema {
              query: QueryRoot
            }
            type QueryRoot {
              rootField: String
            }

            extend schema {
            mutation: MutationRoot
          }
          extend type MutationRoot {
            rootField: String
          }
          `
        );

        expect(schema.getType("MutationRoot")).toMatchInlineSnapshot(`
type MutationRoot {
  rootField: String
}
`);
        expect(schema.getQueryType()).toEqual(schema.getType("QueryRoot"));
        expect(schema.getMutationType()).toEqual(
          schema.getType("MutationRoot")
        );
      });
    });
  });

  describe(`directives`, () => {
    it(`should construct directives from definitions`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          directive @something on FIELD_DEFINITION
          directive @another on FIELD_DEFINITION
        `
      );

      expect(schema.getDirective("something")).toMatchInlineSnapshot(
        `"@something"`
      );

      expect(schema.getDirective("another")).toMatchInlineSnapshot(
        `"@another"`
      );
    });

    it(`should not allow multiple directive definitions with the same name`, () => {
      expect(() =>
        buildSchemaFromSDL(
          gql`
            directive @something on FIELD_DEFINITION
            directive @something on FIELD_DEFINITION
          `
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"There can be only one directive named \\"something\\"."`
      );
    });

    it(`should not allow a directive definition with the same name as a predefined schema directive`, () => {
      expect(() =>
        buildSchemaFromSDL(
          gql`
            directive @something on FIELD_DEFINITION
          `,
          new GraphQLSchema({
            query: undefined,
            directives: [
              new GraphQLDirective({
                name: "something",
                locations: [DirectiveLocation.FIELD_DEFINITION]
              })
            ]
          })
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Directive \\"something\\" already exists in the schema. It cannot be redefined."`
      );
    });

    it(`should allow predefined schema directives to be used`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          type User {
            name: String @something
          }
        `,
        new GraphQLSchema({
          query: undefined,
          directives: [
            new GraphQLDirective({
              name: "something",
              locations: [DirectiveLocation.FIELD_DEFINITION]
            })
          ]
        })
      );
    });

    it(`should allow schema directives to be used in the same document they are defined in`, () => {
      const schema = buildSchemaFromSDL(
        gql`
          directive @something on FIELD_DEFINITION

          type User {
            name: String @something
          }
        `
      );
    });

    it(`should report an error for unknown schema directives`, () => {
      expect(() =>
        buildSchemaFromSDL(
          gql`
            type User {
              name: String @something
            }
          `
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"Unknown directive \\"something\\"."`
      );
    });
  });
  describe(`resolvers`, () => {
    it(`should add a resolver for a field`, () => {
      const name = () => {};

      const schema = buildSchemaFromSDL([
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
