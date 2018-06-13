import { parse } from 'graphql';

import { generateSource } from '../codeGeneration';

import { loadSchema } from 'apollo-codegen-core/lib/loading';
const starWarsSchema = loadSchema(require.resolve('../../../common-test/fixtures/starwars/schema.json'));
const miscSchema = loadSchema(require.resolve('../../../common-test/fixtures/misc/schema.json'));

import CodeGenerator from 'apollo-codegen-core/lib/utilities/CodeGenerator';

import { compileToLegacyIR } from 'apollo-codegen-core/lib/compiler/legacyIR';

describe('TypeScript code generation', function() {
  let generator;
  let compileFromSource;
  let addFragment;

  function setup(schema) {
    const context = {
      schema: schema,
      operations: {},
      fragments: {},
      typesUsed: {}
    }

    generator = new CodeGenerator(context);

    compileFromSource = (source) => {
      const document = parse(source);
      const context = compileToLegacyIR(schema, document, {
        mergeInFieldsFromFragmentSpreads: true,
        addTypename: true
      });
      generator.context = context;
      return context;
    };

    addFragment = (fragment) => {
      generator.context.fragments[fragment.fragmentName] = fragment;
    };

    return { generator, compileFromSource, addFragment };
  }

  describe('#generateSource()', function() {
    test(`should generate simple query operations`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query HeroName {
          hero {
            name
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate simple query operations including input variables`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate simple nested query operations including input variables`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query HeroAndFriendsNames($episode: Episode) {
          hero(episode: $episode) {
            name
            friends {
              name
            }
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate simple nested with required elements in lists`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query StarshipCoords {
          starship {
            coordinates
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate fragmented query operations`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query HeroAndFriendsNames {
          hero {
            name
            ...heroFriends
          }
        }

        fragment heroFriends on Character {
          friends {
            name
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate query operations with inline fragments`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query HeroAndDetails {
          hero {
            name
            ...HeroDetails
          }
        }

        fragment HeroDetails on Character {
          ... on Droid {
            primaryFunction
          }
          ... on Human {
            height
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate mutation operations with complex input types`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        mutation ReviewMovie($episode: Episode, $review: ReviewInput) {
          createReview(episode: $episode, review: $review) {
            stars
            commentary
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate correct list with custom fragment`, function() {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        fragment Friend on Character {
          name
        }

        query HeroAndFriendsNames($episode: Episode) {
          hero(episode: $episode) {
            name
            friends {
              ...Friend
            }
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should handle single line comments', () => {
      const { compileFromSource } = setup(miscSchema);
      const context = compileFromSource(`
        query CustomScalar {
          commentTest {
            singleLine
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should handle multi-line comments', () => {
      const { compileFromSource } = setup(miscSchema);
      const context = compileFromSource(`
        query CustomScalar {
          commentTest {
            multiLine
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should handle comments in enums', () => {
      const { compileFromSource } = setup(miscSchema);
      const context = compileFromSource(`
        query CustomScalar {
          commentTest {
            enumCommentTest
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should handle interfaces at root', () => {
      const { compileFromSource } = setup(miscSchema);
      const context = compileFromSource(`
        query CustomScalar {
          interfaceTest {
            prop
            ... on ImplA {
              propA
            }
            ... on ImplB {
              propB
            }
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should handle unions at root', () => {
      const { compileFromSource } = setup(miscSchema);
      const context = compileFromSource(`
        query CustomScalar {
          unionTest {
            ... on PartialA {
              prop
            }
            ... on PartialB {
              prop
            }
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should have __typename value matching fragment type on generic type', () => {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query HeroName {
          hero {
            ...HeroWithName
          }
        }

        fragment HeroWithName on Character {
          __typename
          name
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should have __typename value matching fragment type on specific type', () => {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query DroidName {
          droid {
            ...DroidWithName
          }
        }

        fragment DroidWithName on Droid {
          __typename
          name
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should have __typename value in nested property', () => {
      const { compileFromSource } = setup(starWarsSchema);
      const context = compileFromSource(`
        query HeroName {
          hero {
            friendsConnection {
              edges {
                node {
                  name

                }
              }
            }
            ... on Human {
              starships {
                name
              }
            }
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });
  });
});
