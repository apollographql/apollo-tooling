import { expect } from 'chai';

import { stripIndent } from 'common-tags';

import {
  parse,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType
} from 'graphql';

import {
  classDeclarationForOperation,
  initializerDeclarationForProperties,
  structDeclarationForFragment,
  structDeclarationForSelectionSet,
  typeDeclarationForGraphQLType,
} from '../../src/swift/codeGeneration';

import { loadSchema } from '../../src/loading';
const schema = loadSchema(require.resolve('../starwars/schema.json'));

import CodeGenerator from '../../src/utilities/CodeGenerator';

import { compileToIR } from '../../src/compilation';

describe('Swift code generation', function() {
  beforeEach(function() {
    const context = {
      schema: schema,
      operations: {},
      fragments: {},
      typesUsed: {}
    }

    this.generator = new CodeGenerator(context);

    this.compileFromSource = (source) => {
      const document = parse(source);
      const context = compileToIR(schema, document);
      this.generator.context = context;
      return context;
    };

    this.addFragment = (fragment) => {
      this.generator.context.fragments[fragment.fragmentName] = fragment;
    };
  });

  describe('#classDeclarationForOperation()', function() {
    it(`should generate a class declaration for a query with variables`, function() {
      const { operations } = this.compileFromSource(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      classDeclarationForOperation(this.generator, operations['HeroName']);

      expect(this.generator.output).to.include(stripIndent`
        public final class HeroNameQuery: GraphQLQuery {
          public static let operationDefinition =
            "query HeroName($episode: Episode) {" +
            "  hero(episode: $episode) {" +
            "    __typename" +
            "    name" +
            "  }" +
            "}"

          public let episode: Episode?

          public init(episode: Episode? = nil) {
            self.episode = episode
          }

          public var variables: GraphQLMap? {
            return ["episode": episode]
          }
      `);
    });

    it(`should generate a class declaration for a query with fragment spreads`, function() {
      const { operations } = this.compileFromSource(`
        query Hero {
          hero {
            ...HeroDetails
          }
        }

        fragment HeroDetails on Character {
          name
        }
      `);

      classDeclarationForOperation(this.generator, operations['Hero']);

      expect(this.generator.output).to.equal(stripIndent`
        public final class HeroQuery: GraphQLQuery {
          public static let operationDefinition =
            "query Hero {" +
            "  hero {" +
            "    __typename" +
            "    ...HeroDetails" +
            "  }" +
            "}"
          public static let queryDocument = operationDefinition.appending(HeroDetails.fragmentDefinition)
          public init() {
          }

          public struct Data: GraphQLMappable {
            public let hero: Hero?

            public init(reader: GraphQLResultReader) throws {
              hero = try reader.optionalValue(for: Field(responseName: "hero"))
            }

            public struct Hero: GraphQLMappable {
              public let __typename: String

              public let fragments: Fragments

              public init(reader: GraphQLResultReader) throws {
                __typename = try reader.value(for: Field(responseName: "__typename"))

                let heroDetails = try HeroDetails(reader: reader)
                fragments = Fragments(heroDetails: heroDetails)
              }

              public struct Fragments {
                public let heroDetails: HeroDetails
              }
            }
          }
        }
      `);
    });

    it(`should generate a class declaration for a query with conditional fragment spreads`, function() {
      const { operations } = this.compileFromSource(`
        query Hero {
          hero {
            ...DroidDetails
          }
        }

        fragment DroidDetails on Droid {
          primaryFunction
        }
      `);

      classDeclarationForOperation(this.generator, operations['Hero']);

      expect(this.generator.output).to.equal(stripIndent`
        public final class HeroQuery: GraphQLQuery {
          public static let operationDefinition =
            "query Hero {" +
            "  hero {" +
            "    __typename" +
            "    ...DroidDetails" +
            "  }" +
            "}"
          public static let queryDocument = operationDefinition.appending(DroidDetails.fragmentDefinition)
          public init() {
          }

          public struct Data: GraphQLMappable {
            public let hero: Hero?

            public init(reader: GraphQLResultReader) throws {
              hero = try reader.optionalValue(for: Field(responseName: "hero"))
            }

            public struct Hero: GraphQLMappable {
              public let __typename: String

              public let fragments: Fragments

              public init(reader: GraphQLResultReader) throws {
                __typename = try reader.value(for: Field(responseName: "__typename"))

                let droidDetails = try DroidDetails(reader: reader, ifTypeMatches: __typename)
                fragments = Fragments(droidDetails: droidDetails)
              }

              public struct Fragments {
                public let droidDetails: DroidDetails?
              }
            }
          }
        }
      `);
    });

    it(`should generate a class declaration for a query with a fragment spread nested in an inline fragment`, function() {
      const { operations } = this.compileFromSource(`
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

      classDeclarationForOperation(this.generator, operations['Hero']);

      expect(this.generator.output).to.equal(stripIndent`
        public final class HeroQuery: GraphQLQuery {
          public static let operationDefinition =
            "query Hero {" +
            "  hero {" +
            "    __typename" +
            "    ... on Droid {" +
            "      ...HeroDetails" +
            "    }" +
            "  }" +
            "}"
          public static let queryDocument = operationDefinition.appending(HeroDetails.fragmentDefinition)
          public init() {
          }

          public struct Data: GraphQLMappable {
            public let hero: Hero?

            public init(reader: GraphQLResultReader) throws {
              hero = try reader.optionalValue(for: Field(responseName: "hero"))
            }

            public struct Hero: GraphQLMappable {
              public let __typename: String

              public let asDroid: AsDroid?

              public init(reader: GraphQLResultReader) throws {
                __typename = try reader.value(for: Field(responseName: "__typename"))

                asDroid = try AsDroid(reader: reader, ifTypeMatches: __typename)
              }

              public struct AsDroid: GraphQLConditionalFragment {
                public static let possibleTypes = ["Droid"]

                public let __typename = "Droid"

                public let fragments: Fragments

                public init(reader: GraphQLResultReader) throws {
                  let heroDetails = try HeroDetails(reader: reader)
                  fragments = Fragments(heroDetails: heroDetails)
                }

                public struct Fragments {
                  public let heroDetails: HeroDetails
                }
              }
            }
          }
        }
      `);
    });

    it(`should generate a class declaration for a mutation with variables`, function() {
      const { operations } = this.compileFromSource(`
        mutation CreateReview($episode: Episode) {
          createReview(episode: $episode, review: { stars: 5, commentary: "Wow!" }) {
            stars
            commentary
          }
        }
      `);

      classDeclarationForOperation(this.generator, operations['CreateReview']);

      expect(this.generator.output).to.include(stripIndent`
        public final class CreateReviewMutation: GraphQLMutation {
          public static let operationDefinition =
            "mutation CreateReview($episode: Episode) {" +
            "  createReview(episode: $episode, review: {stars: 5, commentary: \\"Wow!\\"}) {" +
            "    stars" +
            "    commentary" +
            "  }" +
            "}"

          public let episode: Episode?

          public init(episode: Episode? = nil) {
            self.episode = episode
          }

          public var variables: GraphQLMap? {
            return ["episode": episode]
          }
      `);
    });
  });

  describe('#initializerDeclarationForProperties()', function() {
    it(`should generate initializer for a property`, function() {
      initializerDeclarationForProperties(this.generator, [
        { propertyName: 'episode', type: new GraphQLNonNull(schema.getType('Episode')), typeName: 'Episode' }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public init(episode: Episode) {
          self.episode = episode
        }
      `);
    });

    it(`should generate initializer for an optional property`, function() {
      initializerDeclarationForProperties(this.generator, [
        { propertyName: 'episode', type: schema.getType('Episode'), typeName: 'Episode?', isOptional: true }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public init(episode: Episode? = nil) {
          self.episode = episode
        }
      `);
    });

    it(`should generate initializer for multiple properties`, function() {
      initializerDeclarationForProperties(this.generator, [
        { propertyName: 'episode', type: schema.getType('Episode'), typeName: 'Episode?', isOptional: true },
        { propertyName: 'scene', type: GraphQLString, typeName: 'String?', isOptional: true }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public init(episode: Episode? = nil, scene: String? = nil) {
          self.episode = episode
          self.scene = scene
        }
      `);
    });
  });

  describe('#structDeclarationForFragment()', function() {
    it(`should generate a struct declaration for a fragment with an abstract type condition`, function() {
      const { fragments } = this.compileFromSource(`
        fragment HeroDetails on Character {
          name
          appearsIn
        }
      `);

      structDeclarationForFragment(this.generator, fragments['HeroDetails']);

      expect(this.generator.output).to.equal(stripIndent`
        public struct HeroDetails: GraphQLNamedFragment {
          public static let fragmentDefinition =
            "fragment HeroDetails on Character {" +
            "  __typename" +
            "  name" +
            "  appearsIn" +
            "}"

          public static let possibleTypes = ["Human", "Droid"]

          public let __typename: String
          public let name: String
          public let appearsIn: [Episode?]

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            name = try reader.value(for: Field(responseName: "name"))
            appearsIn = try reader.list(for: Field(responseName: "appearsIn"))
          }
        }
      `);
    });

    it(`should generate a struct declaration for a fragment with a concrete type condition`, function() {
      const { fragments } = this.compileFromSource(`
        fragment DroidDetails on Droid {
          name
          primaryFunction
        }
      `);

      structDeclarationForFragment(this.generator, fragments['DroidDetails']);

      expect(this.generator.output).to.equal(stripIndent`
        public struct DroidDetails: GraphQLNamedFragment {
          public static let fragmentDefinition =
            "fragment DroidDetails on Droid {" +
            "  name" +
            "  primaryFunction" +
            "}"

          public static let possibleTypes = ["Droid"]

          public let __typename = "Droid"
          public let name: String
          public let primaryFunction: String?

          public init(reader: GraphQLResultReader) throws {
            name = try reader.value(for: Field(responseName: "name"))
            primaryFunction = try reader.optionalValue(for: Field(responseName: "primaryFunction"))
          }
        }
      `);
    });

    it(`should generate a struct declaration for a fragment with a subselection`, function() {
      const { fragments } = this.compileFromSource(`
        fragment HeroDetails on Character {
          name
          friends {
            name
          }
        }
      `);

      structDeclarationForFragment(this.generator, fragments['HeroDetails']);

      expect(this.generator.output).to.equal(stripIndent`
        public struct HeroDetails: GraphQLNamedFragment {
          public static let fragmentDefinition =
            "fragment HeroDetails on Character {" +
            "  __typename" +
            "  name" +
            "  friends {" +
            "    __typename" +
            "    name" +
            "  }" +
            "}"

          public static let possibleTypes = ["Human", "Droid"]

          public let __typename: String
          public let name: String
          public let friends: [Friend?]?

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            name = try reader.value(for: Field(responseName: "name"))
            friends = try reader.optionalList(for: Field(responseName: "friends"))
          }

          public struct Friend: GraphQLMappable {
            public let __typename: String
            public let name: String

            public init(reader: GraphQLResultReader) throws {
              __typename = try reader.value(for: Field(responseName: "__typename"))
              name = try reader.value(for: Field(responseName: "name"))
            }
          }
        }
      `);
    });

    it(`should generate a struct declaration for a fragment that includes a fragment spread`, function() {
      const { fragments } = this.compileFromSource(`
        fragment HeroDetails on Character {
          name
          ...MoreHeroDetails
        }

        fragment MoreHeroDetails on Character {
          appearsIn
        }
      `);

      structDeclarationForFragment(this.generator, fragments['HeroDetails']);

      expect(this.generator.output).to.equal(stripIndent`
        public struct HeroDetails: GraphQLNamedFragment {
          public static let fragmentDefinition =
            "fragment HeroDetails on Character {" +
            "  __typename" +
            "  name" +
            "  ...MoreHeroDetails" +
            "}"

          public static let possibleTypes = ["Human", "Droid"]

          public let __typename: String
          public let name: String

          public let fragments: Fragments

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            name = try reader.value(for: Field(responseName: "name"))

            let moreHeroDetails = try MoreHeroDetails(reader: reader)
            fragments = Fragments(moreHeroDetails: moreHeroDetails)
          }

          public struct Fragments {
            public let moreHeroDetails: MoreHeroDetails
          }
        }
      `);
    });
  });

  describe('#structDeclarationForSelectionSet()', function() {
    it(`should generate a struct declaration for a selection set`, function() {
      structDeclarationForSelectionSet(this.generator, {
        structName: 'Hero',
        parentType: schema.getType('Character'),
        fields: [
          {
            responseName: 'name',
            fieldName: 'name',
            type: GraphQLString
          }
        ]
      });

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMappable {
          public let __typename: String
          public let name: String?

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            name = try reader.optionalValue(for: Field(responseName: "name"))
          }
        }
      `);
    });

    it(`should escape reserved keywords in a struct declaration for a selection set`, function() {
      structDeclarationForSelectionSet(this.generator, {
        structName: 'Hero',
        parentType: schema.getType('Character'),
        fields: [
          {
            responseName: 'private',
            fieldName: 'name',
            type: GraphQLString
          }
        ]
      });

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMappable {
          public let __typename: String
          public let \`private\`: String?

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            \`private\` = try reader.optionalValue(for: Field(responseName: "private", fieldName: "name"))
          }
        }
      `);
    });

    it(`should generate a nested struct declaration for a selection set with subselections`, function() {
      structDeclarationForSelectionSet(this.generator, {
        structName: 'Hero',
        parentType: schema.getType('Character'),
        fields: [
          {
            responseName: 'friends',
            fieldName: 'friends',
            type: new GraphQLList(schema.getType('Character')),
            fields: [
              {
                responseName: 'name',
                fieldName: 'name',
                type: GraphQLString
              }
            ]
          }
        ]
      });

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMappable {
          public let __typename: String
          public let friends: [Friend?]?

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            friends = try reader.optionalList(for: Field(responseName: "friends"))
          }

          public struct Friend: GraphQLMappable {
            public let __typename: String
            public let name: String?

            public init(reader: GraphQLResultReader) throws {
              __typename = try reader.value(for: Field(responseName: "__typename"))
              name = try reader.optionalValue(for: Field(responseName: "name"))
            }
          }
        }
      `);
    });

    it(`should generate a struct declaration for a selection set with a fragment spread that matches the parent type`, function() {
      this.addFragment({
        fragmentName: 'HeroDetails',
        typeCondition: schema.getType('Character')
      });

      structDeclarationForSelectionSet(this.generator, {
        structName: 'Hero',
        parentType: schema.getType('Character'),
        fragmentSpreads: ['HeroDetails'],
        fields: [
          {
            responseName: 'name',
            fieldName: 'name',
            type: GraphQLString
          }
        ]
      });

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMappable {
          public let __typename: String
          public let name: String?

          public let fragments: Fragments

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            name = try reader.optionalValue(for: Field(responseName: "name"))

            let heroDetails = try HeroDetails(reader: reader)
            fragments = Fragments(heroDetails: heroDetails)
          }

          public struct Fragments {
            public let heroDetails: HeroDetails
          }
        }
      `);
    });

    it(`should generate a struct declaration for a selection set with a fragment spread with a more specific type condition`, function() {
      this.addFragment({
        fragmentName: 'DroidDetails',
        typeCondition: schema.getType('Droid')
      });

      structDeclarationForSelectionSet(this.generator, {
        structName: 'Hero',
        parentType: schema.getType('Character'),
        fragmentSpreads: ['DroidDetails'],
        fields: [
          {
            responseName: 'name',
            fieldName: 'name',
            type: GraphQLString
          }
        ]
      });

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMappable {
          public let __typename: String
          public let name: String?

          public let fragments: Fragments

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            name = try reader.optionalValue(for: Field(responseName: "name"))

            let droidDetails = try DroidDetails(reader: reader, ifTypeMatches: __typename)
            fragments = Fragments(droidDetails: droidDetails)
          }

          public struct Fragments {
            public let droidDetails: DroidDetails?
          }
        }
      `);
    });

    it(`should generate a struct declaration for a selection set with an inline fragment`, function() {
      structDeclarationForSelectionSet(this.generator, {
        structName: 'Hero',
        parentType: schema.getType('Character'),
        fields: [
          {
            responseName: 'name',
            fieldName: 'name',
            type: new GraphQLNonNull(GraphQLString)
          }
        ],
        inlineFragments: [
          {
            typeCondition: schema.getType('Droid'),
            fields: [
              {
                responseName: 'name',
                fieldName: 'name',
                type: new GraphQLNonNull(GraphQLString)
              },
              {
                responseName: 'primaryFunction',
                fieldName: 'primaryFunction',
                type: GraphQLString
              }
            ]
          }
        ]
      });

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMappable {
          public let __typename: String
          public let name: String

          public let asDroid: AsDroid?

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))
            name = try reader.value(for: Field(responseName: "name"))

            asDroid = try AsDroid(reader: reader, ifTypeMatches: __typename)
          }

          public struct AsDroid: GraphQLConditionalFragment {
            public static let possibleTypes = ["Droid"]

            public let __typename = "Droid"
            public let name: String
            public let primaryFunction: String?

            public init(reader: GraphQLResultReader) throws {
              name = try reader.value(for: Field(responseName: "name"))
              primaryFunction = try reader.optionalValue(for: Field(responseName: "primaryFunction"))
            }
          }
        }
      `);
    });

    it(`should generate a struct declaration for a fragment spread nested in an inline fragment`, function() {
      this.addFragment({
        fragmentName: 'HeroDetails',
        typeCondition: schema.getType('Character')
      });

      structDeclarationForSelectionSet(this.generator, {
        structName: 'Hero',
        parentType: schema.getType('Character'),
        fields: [],
        inlineFragments: [
          {
            typeCondition: schema.getType('Droid'),
            fields: [],
            fragmentSpreads: ['HeroDetails'],
          }
        ]
      });

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMappable {
          public let __typename: String

          public let asDroid: AsDroid?

          public init(reader: GraphQLResultReader) throws {
            __typename = try reader.value(for: Field(responseName: "__typename"))

            asDroid = try AsDroid(reader: reader, ifTypeMatches: __typename)
          }

          public struct AsDroid: GraphQLConditionalFragment {
            public static let possibleTypes = ["Droid"]

            public let __typename = "Droid"

            public let fragments: Fragments

            public init(reader: GraphQLResultReader) throws {
              let heroDetails = try HeroDetails(reader: reader)
              fragments = Fragments(heroDetails: heroDetails)
            }

            public struct Fragments {
              public let heroDetails: HeroDetails
            }
          }
        }
      `);
    });
  });

  describe('#typeDeclarationForGraphQLType()', function() {
    it('should generate an enum declaration for a GraphQLEnumType', function() {
      const generator = new CodeGenerator();

      typeDeclarationForGraphQLType(generator, schema.getType('Episode'));

      expect(generator.output).to.equal(stripIndent`
        /// The episodes in the Star Wars trilogy
        public enum Episode: String {
          case newhope = "NEWHOPE" /// Star Wars Episode IV: A New Hope, released in 1977.
          case empire = "EMPIRE" /// Star Wars Episode V: The Empire Strikes Back, released in 1980.
          case jedi = "JEDI" /// Star Wars Episode VI: Return of the Jedi, released in 1983.
        }

        extension Episode: JSONDecodable, JSONEncodable {}
      `);
    });

    it('should generate a struct declaration for a GraphQLInputObjectType', function() {
      const generator = new CodeGenerator();

      typeDeclarationForGraphQLType(generator, schema.getType('ReviewInput'));

      expect(generator.output).to.equal(stripIndent`
        /// The input object sent when someone is creating a new review
        public struct ReviewInput: GraphQLMapConvertible {
          public var graphQLMap: GraphQLMap

          public init(stars: Int, commentary: String? = nil, favoriteColor: ColorInput? = nil) {
            graphQLMap = ["stars": stars, "commentary": commentary, "favoriteColor": favoriteColor]
          }
        }
      `);
    });
  });
});
