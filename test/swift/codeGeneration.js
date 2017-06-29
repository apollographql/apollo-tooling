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
  typeDeclarationForGraphQLType,
} from '../../src/swift/codeGeneration';

import {
  dictionaryLiteralForFieldArguments,
} from '../../src/swift/values';

import { loadSchema } from '../../src/loading';
const schema = loadSchema(require.resolve('../starwars/schema.json'));

import CodeGenerator from '../../src/utilities/CodeGenerator';

import { compileToIR } from '../../src/compilation';

describe('Swift code generation', function() {
  let generator;
  let resetGenerator;
  let compileFromSource;
  let addFragment;

  beforeEach(function() {

    resetGenerator = () => {
      const context = {
        schema: schema,
        operations: {},
        fragments: {},
        typesUsed: {}
      }
      generator = new CodeGenerator(context);  
    };

    compileFromSource = (source, options = { generateOperationIds: false }) => {
      const document = parse(source);
      let context = compileToIR(schema, document);
      options.generateOperationIds && Object.assign(context, { generateOperationIds: true, operationIdsMap: {} });
      generator.context = context;
      return context;
    };

    addFragment = (fragment) => {
      generator.context.fragments[fragment.fragmentName] = fragment;
    };

    resetGenerator();
  });

  describe('#classDeclarationForOperation()', function() {
    test(`should generate a class declaration for a query with variables`, function() {
      const { operations, fragments } = compileFromSource(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      classDeclarationForOperation(generator, operations['HeroName'], Object.values(fragments));
      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a query with fragment spreads`, function() {
      const { operations, fragments } = compileFromSource(`
        query Hero {
          hero {
            ...HeroDetails
          }
        }

        fragment HeroDetails on Character {
          name
        }
      `);

      classDeclarationForOperation(generator, operations['Hero'], Object.values(fragments));
      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a query with conditional fragment spreads`, function() {
      const { operations, fragments } = compileFromSource(`
        query Hero {
          hero {
            ...DroidDetails
          }
        }

        fragment DroidDetails on Droid {
          primaryFunction
        }
      `);

      classDeclarationForOperation(generator, operations['Hero'], Object.values(fragments));
      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a query with a fragment spread nested in an inline fragment`, function() {
      const { operations, fragments } = compileFromSource(`
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

      classDeclarationForOperation(generator, operations['Hero'], Object.values(fragments));

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a class declaration for a mutation with variables`, function() {
      const { operations, fragments } = compileFromSource(`
        mutation CreateReview($episode: Episode) {
          createReview(episode: $episode, review: { stars: 5, commentary: "Wow!" }) {
            stars
            commentary
          }
        }
      `);

      classDeclarationForOperation(generator, operations['CreateReview'], Object.values(fragments));

      expect(generator.output).toMatchSnapshot();
    });

    describe(`when generateOperationIds is specified`, function() {
      let compileOptions = { generateOperationIds: true };

      test(`should generate a class declaration with an operationId property`, function() {
        const context = compileFromSource(`
          query Hero {
            hero {
              ...HeroDetails
            }
          }
          fragment HeroDetails on Character {
            name
          }
        `, compileOptions);

        classDeclarationForOperation(generator, context.operations['Hero'], Object.values(context.fragments));
        expect(generator.output).toMatchSnapshot();
      });

      test(`should generate different operation ids for different operations`, function() {
        const context1 = compileFromSource(`
          query Hero {
            hero {
              ...HeroDetails
            }
          }
          fragment HeroDetails on Character {
            name
          }
        `, compileOptions);

        classDeclarationForOperation(generator, context1.operations['Hero'], Object.values(context1.fragments));
        const output1 = generator.output;

        resetGenerator();
        const context2 = compileFromSource(`
          query Hero {
            hero {
              ...HeroDetails
            }
          }
          fragment HeroDetails on Character {
            appearsIn
          }
        `, compileOptions);

        classDeclarationForOperation(generator, context2.operations['Hero'], Object.values(context2.fragments));
        const output2 = generator.output;

        expect(output1).not.toBe(output2);
      });

      test(`should generate the same operation id regardless of operation formatting/commenting`, function() {
        const context1 = compileFromSource(`
          query HeroName($episode: Episode) {
            hero(episode: $episode) {
              name
            }
          }
        `, compileOptions);

        classDeclarationForOperation(generator, context1.operations['HeroName'], Object.values(context1.fragments));
        const output1 = generator.output;

        resetGenerator();
        const context2 = compileFromSource(`
          # Profound comment
          query HeroName($episode:Episode) { hero(episode: $episode) { name } }
          # Deeply meaningful comment
        `, compileOptions);

        classDeclarationForOperation(generator, context2.operations['HeroName'], Object.values(context2.fragments));
        const output2 = generator.output;

        expect(output1).toBe(output2);
      });

      test(`should generate the same operation id regardless of fragment order`, function() {
        const context1 = compileFromSource(`
          query Hero {
            hero {
              ...HeroName
              ...HeroAppearsIn
            }
          }
          fragment HeroName on Character {
            name
          }
          fragment HeroAppearsIn on Character {
            appearsIn
          }
        `, compileOptions);

        classDeclarationForOperation(generator, context1.operations['Hero'], Object.values(context1.fragments));
        const output1 = generator.output;

        resetGenerator();
        const context2 = compileFromSource(`
          query Hero {
            hero {
              ...HeroName
              ...HeroAppearsIn
            }
          }
          fragment HeroAppearsIn on Character {
            appearsIn
          }
          fragment HeroName on Character {
            name
          }
        `, compileOptions);

        classDeclarationForOperation(generator, context2.operations['Hero'], Object.values(context2.fragments));
        const output2 = generator.output;

        expect(output1).toBe(output2);
      });

      test(`should generate appropriate operation id mapping source when there are nested fragment references`, function() {
        const source = `
          query Hero {
            hero {
              ...HeroDetails
            }
          }
          fragment HeroName on Character {
            name
          }
          fragment HeroDetails on Character {
            ...HeroName
            appearsIn
          }
        `;
        const context = compileFromSource(source, true);
        expect(context.operations['Hero'].sourceWithFragments).toMatchSnapshot();
      });

    });
  });

  describe('#initializerDeclarationForProperties()', function() {
    test(`should generate initializer for a property`, function() {
      initializerDeclarationForProperties(generator, [
        { propertyName: 'episode', type: new GraphQLNonNull(schema.getType('Episode')), typeName: 'Episode' }
      ]);

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate initializer for an optional property`, function() {
      initializerDeclarationForProperties(generator, [
        { propertyName: 'episode', type: schema.getType('Episode'), typeName: 'Episode?', isOptional: true }
      ]);

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate initializer for multiple properties`, function() {
      initializerDeclarationForProperties(generator, [
        { propertyName: 'episode', type: schema.getType('Episode'), typeName: 'Episode?', isOptional: true },
        { propertyName: 'scene', type: GraphQLString, typeName: 'String?', isOptional: true }
      ]);

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe('#structDeclarationForFragment()', function() {
    test(`should generate a struct declaration for a fragment with an abstract type condition`, function() {
      const { fragments } = compileFromSource(`
        fragment HeroDetails on Character {
          name
          appearsIn
        }
      `);

      structDeclarationForFragment(generator, fragments['HeroDetails']);

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment with a concrete type condition`, function() {
      const { fragments } = compileFromSource(`
        fragment DroidDetails on Droid {
          name
          primaryFunction
        }
      `);

      structDeclarationForFragment(generator, fragments['DroidDetails']);

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment with a subselection`, function() {
      const { fragments } = compileFromSource(`
        fragment HeroDetails on Character {
          name
          friends {
            name
          }
        }
      `);

      structDeclarationForFragment(generator, fragments['HeroDetails']);

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment that includes a fragment spread`, function() {
      const { fragments } = compileFromSource(`
        fragment HeroDetails on Character {
          name
          ...MoreHeroDetails
        }

        fragment MoreHeroDetails on Character {
          appearsIn
        }
      `);

      structDeclarationForFragment(generator, fragments['HeroDetails']);

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe('#structDeclarationForSelectionSet()', function() {
    test(`should generate a struct declaration for a selection set`, function() {
      structDeclarationForSelectionSet(generator, {
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

      expect(generator.output).toMatchSnapshot();
    });

    test(`should escape reserved keywords in a struct declaration for a selection set`, function() {
      structDeclarationForSelectionSet(generator, {
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

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a nested struct declaration for a selection set with subselections`, function() {
      structDeclarationForSelectionSet(generator, {
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

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a selection set with a fragment spread that matches the parent type`, function() {
      addFragment({
        fragmentName: 'HeroDetails',
        typeCondition: schema.getType('Character')
      });

      structDeclarationForSelectionSet(generator, {
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

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a selection set with a fragment spread with a more specific type condition`, function() {
      addFragment({
        fragmentName: 'DroidDetails',
        typeCondition: schema.getType('Droid')
      });

      structDeclarationForSelectionSet(generator, {
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

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a selection set with an inline fragment`, function() {
      structDeclarationForSelectionSet(generator, {
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

      expect(generator.output).toMatchSnapshot();
    });

    test(`should generate a struct declaration for a fragment spread nested in an inline fragment`, function() {
      addFragment({
        fragmentName: 'HeroDetails',
        typeCondition: schema.getType('Character')
      });

      structDeclarationForSelectionSet(generator, {
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

      expect(generator.output).toMatchSnapshot();
    });
  });

  describe('#dictionaryLiteralForFieldArguments()', function() {
    test('should include expressions for input objects with variables', function() {
      const { operations } = compileFromSource(`
        mutation FieldArgumentsWithInputObjects($commentary: String!, $red: Int!) {
          createReview(episode: JEDI, review: { stars: 2, commentary: $commentary, favorite_color: { red: $red, blue: 100, green: 50 } }) {
            commentary
          }
        }
      `);

      const fieldArguments = operations['FieldArgumentsWithInputObjects'].fields[0].args;
      const dictionaryLiteral = dictionaryLiteralForFieldArguments(fieldArguments);

      expect(dictionaryLiteral).toBe('["episode": "JEDI", "review": ["stars": 2, "commentary": Variable("commentary"), "favorite_color": ["red": Variable("red"), "blue": 100, "green": 50]]]');
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
