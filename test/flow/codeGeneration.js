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
} from '../../src/flow/codeGeneration';

import { loadSchema } from '../../src/loading';
const swapiSchema = loadSchema(require.resolve('../starwars/schema.json'));
const miscSchema = loadSchema(require.resolve('../misc/schema.json'));

import CodeGenerator from '../../src/utilities/CodeGenerator';

import { compileToIR } from '../../src/compilation';

function setup(schema) {
  const context = {
    schema: schema,
    operations: {},
    fragments: {},
    typesUsed: {}
  }

  const generator = new CodeGenerator(context);

  const compileFromSource = (source, addTypename = false) => {
    const document = parse(source);
    const context = compileToIR(schema, document);
    context.addTypename = addTypename;
    generator.context = context;
    return context;
  };

  const addFragment = (fragment) => {
    generator.context.fragments[fragment.fragmentName] = fragment;
  };

  return { generator, compileFromSource, addFragment };
}

describe('Flow code generation', function() {
  describe('#generateSource()', function() {
    describe('__typename', function() {
      test('in an object', function() {
        const { compileFromSource } = setup(swapiSchema);
        const context = compileFromSource(`
          query HeroName {
            hero {
              __typename
              name
            }
          }
        `);

        const source = generateSource(context);
        expect(source).toMatchSnapshot();
      });

      // TODO: Enable after fixing operation
      test.skip('in an operation', function() {
        const { compileFromSource } = setup(swapiSchema);
        const context = compileFromSource(`
          query Hero {
            ...Hero
          }

          fragment Hero on Query {
            hero {
              __typename
              name
            }
          }
        `);

        const source = generateSource(context);
        expect(source).toMatchSnapshot();
      });

      test('single fragment spread', () => {
        const { compileFromSource } = setup(swapiSchema);
        const context = compileFromSource(`
          query HeroName {
            hero {
              ...humanFriends
            }
          }

          fragment humanFriends on Character {
            friends {
              __typename
              name
            }
          }
        `);

        const source = generateSource(context);
        expect(source).toMatchSnapshot();
      });

      test('in fragment spreads, allows for disjoint union via __typename string literals', function() {
        const { compileFromSource } = setup(swapiSchema);
        const context = compileFromSource(`
          query HeroName {
            hero {
              __typename
              ...humanHero
              ...droidHero
            }
          }

          fragment droidHero on Droid {
            primaryFunction
          }

          fragment humanHero on Human {
            homePlanet
          }
        `);

        const source = generateSource(context);
        expect(source).toMatchSnapshot();
      });

      test('in inline fragments, allows for disjoint union via __typename string literals', function() {
        const { compileFromSource } = setup(swapiSchema);
        const context = compileFromSource(`
          query HeroName {
            hero {
              __typename

              ... on Droid {
                friends {
                  name
                }
              }
              ... on Human {
                homePlanet
              }
            }
          }
        `);

        const source = generateSource(context);
        expect(source).toMatchSnapshot();
      });
    });

    test(`should generate simple query operations`, function() {
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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
      const { compileFromSource } = setup(swapiSchema);
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

    test(`should annotate custom scalars as string`, function() {
      const { compileFromSource } = setup(miscSchema);
      const context = compileFromSource(`
        query CustomScalar {
          misc {
            date
          }
        }
      `);

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should correctly handle fragments on interfaces', function() {
      const {compileFromSource} = setup(swapiSchema);
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

    test('should correctly handle fragment spreads on interfaces', function() {
      const {compileFromSource} = setup(swapiSchema);
      const context = compileFromSource(
        `
        query HeroQuery($episode: Episode){
          hero(episode: $episode) {
            name
            ...humanFragment
            ...droidFragment
          }
        }

        fragment humanFragment on Human {
          homePlanet
        }

        fragment droidFragment on Droid {
          primaryFunction
        }
      `
      );

      const source = generateSource(context);
      expect(source).toMatchSnapshot();
    });

    test('should correctly handle nested fragments on interfaces', function() {
      const {compileFromSource} = setup(swapiSchema);
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
      const {compileFromSource} = setup(swapiSchema);
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
      const {compileFromSource} = setup(swapiSchema);
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
