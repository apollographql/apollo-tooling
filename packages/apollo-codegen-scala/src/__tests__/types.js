import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType
} from "graphql";

import { loadSchema } from "apollo-codegen-core/lib/loading";
const schema = loadSchema(
  require.resolve("../../../../__fixtures__/starwars/schema.json")
);

import { typeNameFromGraphQLType } from "../types";

describe("Scala code generation: Types", function() {
  describe("#typeNameFromGraphQLType()", function() {
    test("should return Option[String] for GraphQLString", function() {
      expect(typeNameFromGraphQLType({ options: {} }, GraphQLString)).toBe(
        "Option[String]"
      );
    });

    test("should return String for GraphQLNonNull(GraphQLString)", function() {
      expect(
        typeNameFromGraphQLType(
          { options: {} },
          new GraphQLNonNull(GraphQLString)
        )
      ).toBe("String");
    });

    test("should return Option[Seq[Option[String]]] for GraphQLList(GraphQLString)", function() {
      expect(
        typeNameFromGraphQLType({ options: {} }, new GraphQLList(GraphQLString))
      ).toBe("Option[Seq[Option[String]]]");
    });

    test("should return Seq[String] for GraphQLNonNull(GraphQLList(GraphQLString))", function() {
      expect(
        typeNameFromGraphQLType(
          { options: {} },
          new GraphQLNonNull(new GraphQLList(GraphQLString))
        )
      ).toBe("Seq[Option[String]]");
    });

    test("should return Option[Seq[String]] for GraphQLList(GraphQLNonNull(GraphQLString))", function() {
      expect(
        typeNameFromGraphQLType(
          { options: {} },
          new GraphQLList(new GraphQLNonNull(GraphQLString))
        )
      ).toBe("Option[Seq[String]]");
    });

    test("should return Seq[String] for GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))", function() {
      expect(
        typeNameFromGraphQLType(
          { options: {} },
          new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
        )
      ).toBe("Seq[String]");
    });

    test("should return Option[Seq[Option[Seq[Option[String]]]]] for GraphQLList(GraphQLList(GraphQLString))", function() {
      expect(
        typeNameFromGraphQLType(
          { options: {} },
          new GraphQLList(new GraphQLList(GraphQLString))
        )
      ).toBe("Option[Seq[Option[Seq[Option[String]]]]]");
    });

    test("should return Option[Seq[Seq[Option[String]]]] for GraphQLList(GraphQLNonNull(GraphQLList(GraphQLString)))", function() {
      expect(
        typeNameFromGraphQLType(
          { options: {} },
          new GraphQLList(new GraphQLNonNull(new GraphQLList(GraphQLString)))
        )
      ).toBe("Option[Seq[Seq[Option[String]]]]");
    });

    test("should return Option[Int] for GraphQLInt", function() {
      expect(typeNameFromGraphQLType({ options: {} }, GraphQLInt)).toBe(
        "Option[Int]"
      );
    });

    test("should return Option[Double] for GraphQLFloat", function() {
      expect(typeNameFromGraphQLType({ options: {} }, GraphQLFloat)).toBe(
        "Option[Double]"
      );
    });

    test("should return Option[Boolean] for GraphQLBoolean", function() {
      expect(typeNameFromGraphQLType({ options: {} }, GraphQLBoolean)).toBe(
        "Option[Boolean]"
      );
    });

    test("should return Option[String] for GraphQLID", function() {
      expect(typeNameFromGraphQLType({ options: {} }, GraphQLID)).toBe(
        "Option[String]"
      );
    });

    test("should return Option[String] for a custom scalar type", function() {
      expect(
        typeNameFromGraphQLType(
          { options: {} },
          new GraphQLScalarType({ name: "CustomScalarType", serialize: String })
        )
      ).toBe("Option[String]");
    });

    test("should return a passed through custom scalar type with the passthroughCustomScalars option", function() {
      expect(
        typeNameFromGraphQLType(
          {
            options: { passthroughCustomScalars: true, customScalarsPrefix: "" }
          },
          new GraphQLScalarType({ name: "CustomScalarType", serialize: String })
        )
      ).toBe("Option[CustomScalarType]");
    });

    test("should return a passed through custom scalar type with a prefix with the customScalarsPrefix option", function() {
      expect(
        typeNameFromGraphQLType(
          {
            options: {
              passthroughCustomScalars: true,
              customScalarsPrefix: "My"
            }
          },
          new GraphQLScalarType({ name: "CustomScalarType", serialize: String })
        )
      ).toBe("Option[MyCustomScalarType]");
    });
  });
});
