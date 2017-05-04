import { stripIndent } from 'common-tags';

import {
  parse,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import {
  generateSource
} from '../../src/typescript/codeGeneration';

import { loadSchema } from '../../src/loading';
const schema = loadSchema(require.resolve('../starwars/schema.json'));

import CodeGenerator from '../../src/utilities/CodeGenerator';

import { compileToIR } from '../../src/compilation';

describe('TypeScript code generation', function() {
  let generator;
  let compileFromSource;
  let addFragment;

  beforeEach(function() {
    const context = {
      schema: schema,
      operations: {},
      fragments: {},
      typesUsed: {}
    }

    generator = new CodeGenerator(context);

    compileFromSource = (source) => {
      const document = parse(source);
      const context = compileToIR(schema, document);
      generator.context = context;
      return context;
    };

    addFragment = (fragment) => {
      generator.context.fragments[fragment.fragmentName] = fragment;
    };
  });

  describe('#generateSource()', function() {
    test(`should generate simple query operations`, function() {
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

    test(`should generate fragmented query operations`, function() {
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

    test(`should handle multi-fragmented query operations`, function() {
      const context = compileFromSource(`
        query HeroAndFriendsNames {
          hero {
            name
            ...heroFriends
            ...heroAppears
          }
        }

        fragment heroFriends on Character {
          friends {
            name
          }
        }

        fragment heroAppears on Character {
          appearsIn
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should generate query operations with inline fragments`, function() {
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

    test(`should generate correct typedefs with a single custom fragment`, function() {
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

    test(`should generate correct typedefs with a multiple custom fragments`, function() {
      const context = compileFromSource(`
        fragment Friend on Character {
          name
        }

        fragment Person on Character {
          name
        }

        query HeroAndFriendsNames($episode: Episode) {
          hero(episode: $episode) {
            name
            friends {
              ...Friend
              ...Person
            }
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test(`should handle complex fragments with type aliases`, function() {
      const context = compileFromSource(`
        query HeroAndFriendsNames {
          hero(episode: NEWHOPE) {
            name
            ...Something
          }
          empireHero: hero(episode: EMPIRE) {
            name
            ...Something
          }
        }

        fragment Something on Character {
          ... on Human {
            friends {
              ... on Human {
                homePlanet
              }

              ... on Droid {
                primaryFunction
              }
            }
          }

          ... on Droid {
            appearsIn
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should correctly handle fragments on interfaces', function() {
      const context = compileFromSource(
        `
        query HeroQuery($episode: Episode){
          hero(episode: $episode) {
            name
            ... on Human {
              homePlanet
            }

            ... on Droid {
              primaryFunction
            }
          }
        }
      `
      );

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should correctly handle nested fragments on interfaces', function() {
      const context = compileFromSource(
        `
        query HeroQuery($episode: Episode){
          hero(episode: $episode) {
            name
            friendsConnection {
              friends {
                ...CharacterFragment
              }
            }
          }
        }

        fragment CharacterFragment on Character {
          name
          __typename

          ... on Human {
            homePlanet
          }

          ... on Droid {
            primaryFunction
          }
        }
      `
      );

      const source = generateSource(context);

      expect(source).toMatchSnapshot();
    });

    test('should correctly add typename to nested fragments on interfaces if addTypename is true', function() {
      const context = compileFromSource(
        `
        query HeroQuery($episode: Episode){
          hero(episode: $episode) {
            name
            friendsConnection {
              friends {
                ...CharacterFragment
              }
            }
          }
        }

        fragment CharacterFragment on Character {
          name
          __typename

          ... on Human {
            homePlanet
          }

          ... on Droid {
            primaryFunction
          }
        }
      `
      );

      const source = generateSource(context, { addTypename: true });

      expect(source).toMatchSnapshot();
    });

    test('should correctly handle doubly nested fragments on interfaces', function() {
      const context = compileFromSource(
        `
        query HeroQuery($episode: Episode) {
          hero(episode: $episode) {
            name
            friendsConnection {
              friends {
                ...CharacterFragment
              }
            }
          }
        }

        fragment CharacterFragment on Character {
          name

          ... on Human {
            homePlanet
            friends {
              ...OtherCharacterFragment
            }
          }

          ... on Droid {
            primaryFunction
          }
        }

        fragment OtherCharacterFragment on Character {
          ... on Human {
            height
          }

          ... on Droid {
            appearsIn
          }
        }
      `
      );

      const source = generateSource(context);

      expect(source).toMatchSnapshot();
    });
  });
});
