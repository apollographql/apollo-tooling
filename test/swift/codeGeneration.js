import { stripIndent } from 'common-tags';

import {
  parse,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLEnumType
} from 'graphql';

import {
  classDeclarationForOperation,
  initializerDeclarationForProperties,
  structDeclarationForFragment,
  structDeclarationForSelectionSet,
  dictionaryLiteralForFieldArguments,
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
    test(`should generate a class declaration for a query with variables`, function() {
      const { operations } = this.compileFromSource(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      classDeclarationForOperation(this.generator, operations['HeroName']);
      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a query with fragment spreads`, function() {
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
      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a query with conditional fragment spreads`, function() {
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
      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a query with a fragment spread nested in an inline fragment`, function() {
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

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a mutation with variables`, function() {
      const { operations } = this.compileFromSource(`
        mutation CreateReview($episode: Episode) {
          createReview(episode: $episode, review: { stars: 5, commentary: "Wow!" }) {
            stars
            commentary
          }
        }
      `);

      classDeclarationForOperation(this.generator, operations['CreateReview']);

      expect(this.generator.output).toMatchSnapshot();
    });
  });

  describe('#initializerDeclarationForProperties()', function() {
    test(`should generate initializer for a property`, function() {
      initializerDeclarationForProperties(this.generator, [
        { propertyName: 'episode', type: new GraphQLNonNull(schema.getType('Episode')), typeName: 'Episode' }
      ]);

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate initializer for an optional property`, function() {
      initializerDeclarationForProperties(this.generator, [
        { propertyName: 'episode', type: schema.getType('Episode'), typeName: 'Episode?', isOptional: true }
      ]);

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate initializer for multiple properties`, function() {
      initializerDeclarationForProperties(this.generator, [
        { propertyName: 'episode', type: schema.getType('Episode'), typeName: 'Episode?', isOptional: true },
        { propertyName: 'scene', type: GraphQLString, typeName: 'String?', isOptional: true }
      ]);

      expect(this.generator.output).toMatchSnapshot();
    });
  });

  describe('#structDeclarationForFragment()', function() {
    test(`should generate a struct declaration for a fragment with an abstract type condition`, function() {
      const { fragments } = this.compileFromSource(`
        fragment HeroDetails on Character {
          name
          appearsIn
        }
      `);

      structDeclarationForFragment(this.generator, fragments['HeroDetails']);

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment with a concrete type condition`, function() {
      const { fragments } = this.compileFromSource(`
        fragment DroidDetails on Droid {
          name
          primaryFunction
        }
      `);

      structDeclarationForFragment(this.generator, fragments['DroidDetails']);

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment with a subselection`, function() {
      const { fragments } = this.compileFromSource(`
        fragment HeroDetails on Character {
          name
          friends {
            name
          }
        }
      `);

      structDeclarationForFragment(this.generator, fragments['HeroDetails']);

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment that includes a fragment spread`, function() {
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

      expect(this.generator.output).toMatchSnapshot();
    });
  });

  describe('#structDeclarationForSelectionSet()', function() {
    test(`should generate a struct declaration for a selection set`, function() {
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

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should escape reserved keywords in a struct declaration for a selection set`, function() {
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

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a nested struct declaration for a selection set with subselections`, function() {
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

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a selection set with a fragment spread that matches the parent type`, function() {
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

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a selection set with a fragment spread with a more specific type condition`, function() {
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

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a selection set with an inline fragment`, function() {
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
            possibleTypes: ['Droid'],
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

      expect(this.generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment spread nested in an inline fragment`, function() {
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
            possibleTypes: ['Droid'],
            fields: [],
            fragmentSpreads: ['HeroDetails'],
          }
        ]
      });

      expect(this.generator.output).toMatchSnapshot();
    });
  });

  describe('#dictionaryLiteralForFieldArguments()', function() {
    test('should include expressions for input objects with variables', function() {
      const { operations } = this.compileFromSource(`
        mutation FieldArgumentsWithInputObjects($commentary: String!, $red: Int!) {
          createReview(episode: JEDI, review: { stars: 2, commentary: $commentary, favorite_color: { red: $red, blue: 100, green: 50 } }) {
            commentary
          }
        }
      `);

      const fieldArguments = operations['FieldArgumentsWithInputObjects'].fields[0].args;
      const dictionaryLiteral = dictionaryLiteralForFieldArguments(fieldArguments);

      expect(dictionaryLiteral).toBe('["episode": "JEDI", "review": ["stars": 2, "commentary": reader.variables["commentary"], "favorite_color": ["red": reader.variables["red"], "blue": 100, "green": 50]]]');
    });
  });

  describe('#typeDeclarationForGraphQLType()', function() {
    test('should generate an enum declaration for a GraphQLEnumType', function() {
      const generator = new CodeGenerator();

      typeDeclarationForGraphQLType(generator, schema.getType('Episode'));

      expect(generator.output).toMatchSnapshot();
    });

    test('should escape identifiers in cases of enum declaration for a GraphQLEnumType', function() {
      const generator = new CodeGenerator();

      const albumPrivaciesEnum = new GraphQLEnumType({
        name: 'AlbumPrivacies',
        values: { PUBLIC: { value: "PUBLIC" }, PRIVATE: { value: "PRIVATE" } }
      });

      typeDeclarationForGraphQLType(generator, albumPrivaciesEnum);

      expect(generator.output).toMatchSnapshot();
    });

    test('should generate a struct declaration for a GraphQLInputObjectType', function() {
      const generator = new CodeGenerator();

      typeDeclarationForGraphQLType(generator, schema.getType('ReviewInput'));

      expect(generator.output).toMatchSnapshot();
    });
  });
});
