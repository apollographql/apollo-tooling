import {
  buildSchema,
  parse,
  GraphQLNonNull,
  GraphQLString,
  GraphQLEnumType,
  GraphQLList
} from "graphql";

import { loadSchema } from "apollo-codegen-core/lib/loading";
const schema = loadSchema(
  require.resolve("../../../../__fixtures__/starwars/schema.json")
);

import {
  compileToIR,
  CompilerOptions,
  CompilerContext,
  SelectionSet,
  Field,
  Argument
} from "apollo-codegen-core/lib/compiler";

import { SwiftAPIGenerator } from "../codeGeneration";

describe("Swift code generation", () => {
  let generator: SwiftAPIGenerator;

  beforeEach(() => {
    generator = new SwiftAPIGenerator({});
  });

  function compile(
    source: string,
    options: CompilerOptions = {
      mergeInFieldsFromFragmentSpreads: true,
      omitDeprecatedEnumCases: false
    }
  ): CompilerContext {
    const document = parse(source);
    const context = compileToIR(schema, document, options);
    generator.context = context;
    return context;
  }

  describe("#classDeclarationForOperation()", () => {
    it(`should generate a class declaration for a query with variables`, () => {
      const { operations } = compile(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      generator.classDeclarationForOperation(
        operations["HeroName"],
        false,
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a class declaration for a query with fragment spreads`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            ...HeroDetails
          }
        }

        fragment HeroDetails on Character {
          name
        }
      `);

      generator.classDeclarationForOperation(operations["Hero"], false, false);

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a class declaration for a query with conditional fragment spreads`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            ...DroidDetails
          }
        }

        fragment DroidDetails on Droid {
          primaryFunction
        }
      `);

      generator.classDeclarationForOperation(operations["Hero"], false, false);

      expect(generator.output).toMatchSnapshot();
    });

    it("should correctly escape a mutli-line string literal", () => {
      const { operations } = compile(`
        mutation CreateReview($episode: Episode) {
          createReview(episode: $episode, review: {stars: 5, commentary:
            """
            Wow!
             I thought
              This movie ROCKED!
            """
          }) {
            stars
            commentary
          }
        }
      `);

      generator.classDeclarationForOperation(operations["CreateReview"]);

      expect(generator.output).toMatchSnapshot();
    });

    it("should correctly escape a mutli-line string literal with backslashes", () => {
      const { operations } = compile(`
        mutation CreateReview($episode: Episode) {
          createReview(episode: $episode, review: {stars: 5, commentary:
            """
            Wow!
             I thought
              This movie \\ ROCKED!
            """
          }) {
            stars
            commentary
          }
        }
      `);

      generator.classDeclarationForOperation(
        operations["CreateReview"],
        false,
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a class declaration for a query with a fragment spread nested in an inline fragment`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            ... on Droid {
              ...HeroDetails
            }
          }
        }

        fragment HeroDetails on Character {
          name
        }
      `);

      generator.classDeclarationForOperation(operations["Hero"], false, false);

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a class declaration for a mutation with variables`, () => {
      const { operations } = compile(`
        mutation CreateReview($episode: Episode) {
          createReview(episode: $episode, review: { stars: 5, commentary: "Wow!" }) {
            stars
            commentary
          }
        }
      `);

      generator.classDeclarationForOperation(operations["CreateReview"]);

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a class declaration with an operationIdentifier property when generateOperationIds is specified`, () => {
      const { operations } = compile(
        `
        query Hero {
          hero {
            ...HeroDetails
          }
        }
        fragment HeroDetails on Character {
          name
        }
      `,
        {
          generateOperationIds: true,
          mergeInFieldsFromFragmentSpreads: true,
          omitDeprecatedEnumCases: false
        }
      );

      generator.classDeclarationForOperation(operations["Hero"], false, false);

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe("#initializerDeclarationForProperties()", () => {
    it(`should generate initializer for a property`, () => {
      generator.initializerDeclarationForProperties([
        { propertyName: "episode", typeName: "Episode" }
      ]);

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate initializer for an optional property`, () => {
      generator.initializerDeclarationForProperties([
        { propertyName: "episode", typeName: "Episode?", isOptional: true }
      ]);

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate initializer for multiple properties`, () => {
      generator.initializerDeclarationForProperties([
        { propertyName: "episode", typeName: "Episode?", isOptional: true },
        { propertyName: "scene", typeName: "String?", isOptional: true }
      ]);

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe("#propertyAssignmentForField()", () => {
    it("should generate expression for nullable scalar", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: GraphQLString
        }).source
      ).toBe('"response_key": propertyName');
    });

    it("should generate expression for non-null scalar", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLNonNull(GraphQLString)
        }).source
      ).toBe('"response_key": propertyName');
    });

    it("should generate expression for nullable list of nullable scalars", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLList(GraphQLString)
        }).source
      ).toBe('"response_key": propertyName');
    });

    it("should generate expression for nullable list of non-null scalars", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLList(new GraphQLNonNull(GraphQLString))
        }).source
      ).toBe('"response_key": propertyName');
    });

    it("should generate expression for non-null list of nullable scalars", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLNonNull(new GraphQLList(GraphQLString))
        }).source
      ).toBe('"response_key": propertyName');
    });

    it("should generate expression for non-null list of non-null scalars", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLNonNull(
            new GraphQLList(new GraphQLNonNull(GraphQLString))
          )
        }).source
      ).toBe('"response_key": propertyName');
    });

    it("should generate expression for nullable composite", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: schema.getType("Droid")
        }).source
      ).toBe(
        '"response_key": propertyName.flatMap { (value: Droid) -> ResultMap in value.resultMap }'
      );
    });

    it("should generate expression for non-null composite", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLNonNull(schema.getType("Droid"))
        }).source
      ).toBe('"response_key": propertyName.resultMap');
    });

    it("should generate expression for nullable list of nullable composites", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLList(schema.getType("Droid"))
        }).source
      ).toBe(
        '"response_key": propertyName.flatMap { (value: [Droid?]) -> [ResultMap?] in value.map { (value: Droid?) -> ResultMap? in value.flatMap { (value: Droid) -> ResultMap in value.resultMap } } }'
      );
    });

    it("should generate expression for nullable list of non-null composites", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLList(new GraphQLNonNull(schema.getType("Droid")))
        }).source
      ).toBe(
        '"response_key": propertyName.flatMap { (value: [Droid]) -> [ResultMap] in value.map { (value: Droid) -> ResultMap in value.resultMap } }'
      );
    });

    it("should generate expression for non-null list of nullable composites", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLNonNull(new GraphQLList(schema.getType("Droid")))
        }).source
      ).toBe(
        '"response_key": propertyName.map { (value: Droid?) -> ResultMap? in value.flatMap { (value: Droid) -> ResultMap in value.resultMap } }'
      );
    });

    it("should generate expression for non-null list of non-null composites", () => {
      expect(
        generator.propertyAssignmentForField({
          responseKey: "response_key",
          propertyName: "propertyName",
          type: new GraphQLNonNull(
            new GraphQLList(new GraphQLNonNull(schema.getType("Droid")))
          )
        }).source
      ).toBe(
        '"response_key": propertyName.map { (value: Droid) -> ResultMap in value.resultMap }'
      );
    });
  });

  describe("#propertyDeclarationForField()", () => {
    it(`should generate structName as testCTum for key testCTA`, () => {
      // The existing schemas don't contain any outputs with fields ending in a series of caps,
      // while also being a composite type.
      const schema = buildSchema(`
        schema {
          query: Query
        }
        type Query {
          foo(input: FooInput!): FooOutput
        }
        input FooInput {
          id: ID
        }
        type FooOutput {
          testCTA: Link
        }
        union Link = InternalLink | ExternalLink
        type InternalLink {
          path: String
        }
        type ExternalLink {
          url: String
        }
      `);
      const document = parse(`
        query Test {
          foo(input: {}) {
            testCTA {
              ... on InternalLink {
                path
              }
              ... on ExternalLink {
                url
              }
            }
          }
        }
      `);
      const context = compileToIR(schema, document);
      generator.context = context;

      const { operations, typesUsed } = context;

      const outputField = operations["Test"].selectionSet
        .selections[0] as Field;
      generator.propertyDeclarationForField(outputField.selectionSet
        .selections[0] as (Field & Property));

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe("#structDeclarationForFragment()", () => {
    it(`should generate a struct declaration for a fragment with an abstract type condition`, () => {
      const { fragments } = compile(`
        fragment HeroDetails on Character {
          name
          appearsIn
        }
      `);

      generator.structDeclarationForFragment(fragments["HeroDetails"], false);

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a fragment with a concrete type condition`, () => {
      const { fragments } = compile(`
        fragment DroidDetails on Droid {
          name
          primaryFunction
        }
      `);

      generator.structDeclarationForFragment(
        fragments["DroidDetails"],
        false,
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a fragment with a subselection`, () => {
      const { fragments } = compile(`
        fragment HeroDetails on Character {
          name
          friends {
            name
          }
        }
      `);

      generator.structDeclarationForFragment(
        fragments["HeroDetails"],
        false,
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a fragment that includes a fragment spread`, () => {
      const { fragments } = compile(`
        fragment HeroDetails on Character {
          name
          ...MoreHeroDetails
        }

        fragment MoreHeroDetails on Character {
          appearsIn
        }
      `);

      generator.structDeclarationForFragment(
        fragments["HeroDetails"],
        false,
        false
      );

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe("#structDeclarationForSelectionSet()", () => {
    it(`should generate a struct declaration for a selection set`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            name
          }
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should preserve leading and trailing underscores on fields`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            _name: name
            _camel_case_id__: id
          }
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should escape reserved keywords in a struct declaration for a selection set`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            private: name
            self: friends {
              id
            }
          }
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should escape init specially in a struct declaration initializer for a selection set`, () => {
      const { operations } = compile(`
        query Humans {
          human(id: 0) {
            self: friends {
              id
            }
          }
          human(id: 1) {
            self: friends {
              id
            }
            _self: name
          }
        }
      `);

      const human0 = (operations["Humans"].selectionSet.selections[0] as Field)
        .selectionSet as SelectionSet;
      const human1 = (operations["Humans"].selectionSet.selections[1] as Field)
        .selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Human",
          selectionSet: human0
        },
        false
      );
      generator.structDeclarationForSelectionSet(
        {
          structName: "Human",
          selectionSet: human1
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a nested struct declaration for a selection set with subselections`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            friends {
              name
            }
          }
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a selection set with a fragment spread that matches the parent type`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            name
            ...HeroDetails
          }
        }

        fragment HeroDetails on Character {
          name
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a selection set with a fragment spread with a more specific type condition`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            name
            ...DroidDetails
          }
        }

        fragment DroidDetails on Droid {
          name
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a selection set with an inline fragment`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            name
            ... on Droid {
              primaryFunction
            }
          }
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a fragment spread nested in an inline fragment`, () => {
      const { operations } = compile(`
        query Hero {
          hero {
            name
            ... on Droid {
              ...HeroDetails
            }
          }
        }

        fragment HeroDetails on Character {
          name
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });

    it(`should generate a struct declaration for a selection set with a conditional field`, () => {
      const { operations } = compile(`
        query Hero($includeName: Boolean!) {
          hero {
            name @include(if: $includeName)
          }
        }
      `);

      const selectionSet = (operations["Hero"].selectionSet
        .selections[0] as Field).selectionSet as SelectionSet;

      generator.structDeclarationForSelectionSet(
        {
          structName: "Hero",
          selectionSet
        },
        false
      );

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe("#typeDeclarationForGraphQLType()", () => {
    it("should generate an enum declaration for a GraphQLEnumType", () => {
      generator.typeDeclarationForGraphQLType(schema.getType("Episode"), false);

      expect(generator.output).toMatchSnapshot();
    });

    it("should escape identifiers in cases of enum declaration for a GraphQLEnumType", () => {
      const albumPrivaciesEnum = new GraphQLEnumType({
        name: "AlbumPrivacies",
        values: { PUBLIC: { value: "PUBLIC" }, PRIVATE: { value: "PRIVATE" } }
      });

      generator.typeDeclarationForGraphQLType(albumPrivaciesEnum, false);

      expect(generator.output).toMatchSnapshot();
    });

    it("should omit deprecated cases from an enum declaration for a GraphQLEnumType", () => {
      const { operations } = compile(
        `
          query Starship {
            starship(id: 1) {
              length(unit: METER)
            }
          }
        `,
        {
          generateOperationIds: true,
          mergeInFieldsFromFragmentSpreads: true,
          omitDeprecatedEnumCases: true
        }
      );

      let starship = operations["Starship"].selectionSet.selections[0] as Field;
      let starshipLength = starship.selectionSet.selections[0] as Field;
      let lengthUnitArg = starshipLength.args[0].type;

      generator.typeDeclarationForGraphQLType(lengthUnitArg, false);

      expect(generator.output).toMatchSnapshot();
    });

    it("should include deprecated cases in an enum declaration for a GraphQLEnumType", () => {
      const { operations } = compile(`
          query Starship {
            starship(id: 1) {
              length(unit: METER)
            }
          }
        `);

      let starship = operations["Starship"].selectionSet.selections[0] as Field;
      let starshipLength = starship.selectionSet.selections[0] as Field;
      let lengthUnitArg = starshipLength.args[0].type;

      generator.typeDeclarationForGraphQLType(lengthUnitArg, false);

      expect(generator.output).toMatchSnapshot();
    });

    it("should generate a struct declaration for a GraphQLInputObjectType", () => {
      generator.typeDeclarationForGraphQLType(
        schema.getType("ReviewInput"),
        false
      );

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe("#dictionaryLiteralForFieldArguments()", () => {
    it("should include expressions for input objects with variables", () => {
      const { operations } = compile(`
        mutation FieldArgumentsWithInputObjects($commentary: String!, $red: Int!) {
          createReview(episode: JEDI, review: { stars: 2, commentary: $commentary, favorite_color: { red: $red, blue: 100, green: 50 } }) {
            commentary
          }
        }
      `);

      const fieldArguments = (operations["FieldArgumentsWithInputObjects"]
        .selectionSet.selections[0] as Field).args as Argument[];
      const dictionaryLiteral = generator.helpers.dictionaryLiteralForFieldArguments(
        fieldArguments
      ).source;

      expect(dictionaryLiteral).toBe(
        '["episode": "JEDI", "review": ["stars": 2, "commentary": GraphQLVariable("commentary"), "favorite_color": ["red": GraphQLVariable("red"), "blue": 100, "green": 50]]]'
      );
    });

    it("should handle empty input objects", () => {
      // The existing schemas don't contain any input objects with all nullable types.
      // Extending the schema in a call to `compile` doesn't seem to work.
      // So instead we'll just build our own.
      const schema = buildSchema(`
        schema {
          query: Query
        }
        type Query {
          foo(input: FooInput!): Int
        }
        input FooInput {
          id: ID
        }
      `);
      const document = parse(`
        query FieldArgumentsWithEmptyInputObject {
          foo(input: {}) {
            id
          }
        }
      `);
      const context = compileToIR(schema, document);
      generator.context = context;

      const { operations } = context;
      const fieldArguments = (operations["FieldArgumentsWithEmptyInputObject"]
        .selectionSet.selections[0] as Field).args as Argument[];
      const dictionaryLiteral = generator.helpers.dictionaryLiteralForFieldArguments(
        fieldArguments
      ).source;

      expect(dictionaryLiteral).toBe('["input": [:]]');
    });

    it("should handle empty input arrays", () => {
      // As with the previous test, we need to build our own schema.
      const schema = buildSchema(`
        schema {
          query: Query
        }
        type Query {
          foo(input: [Int!]!): Int
        }
      `);
      const document = parse(`
        query FieldArgumentsWithEmptyInputArray {
          foo(input: []) {
            id
          }
        }
      `);
      const context = compileToIR(schema, document);
      generator.context = context;

      const { operations } = context;
      const fieldArguments = (operations["FieldArgumentsWithEmptyInputArray"]
        .selectionSet.selections[0] as Field).args as Argument[];
      const dictionaryLiteral = generator.helpers.dictionaryLiteralForFieldArguments(
        fieldArguments
      ).source;

      expect(dictionaryLiteral).toBe('["input": []]');
    });

    it("should handle input fields of various scalar types including null", () => {
      // As with the previous test, we need to build our own schema.
      const schema = buildSchema(`
        schema {
          query: Query
        }
        type Query {
          foo(input: FooInput!): Int
        }
        input FooInput {
          id: ID
          id2: ID
          name: String
          age: Int
          rating: Float
          bool: Boolean
        }
      `);
      const document = parse(`
        query FieldArgumentsWithVariousScalars {
          foo(input: { id: null, id2: "4", name: "Anne", age: 27, rating: 4.7, bool: true }) {
            id
          }
        }
      `);
      const context = compileToIR(schema, document);
      generator.context = context;

      const { operations } = context;
      const fieldArguments = (operations["FieldArgumentsWithVariousScalars"]
        .selectionSet.selections[0] as Field).args as Argument[];
      const dictionaryLiteral = generator.helpers.dictionaryLiteralForFieldArguments(
        fieldArguments
      ).source;

      expect(dictionaryLiteral).toBe(
        '["input": ["id": nil, "id2": "4", "name": "Anne", "age": 27, "rating": 4.7, "bool": true]]'
      );
    });
  });
});
