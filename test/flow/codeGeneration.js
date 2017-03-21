import { expect } from 'chai';

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

  const compileFromSource = (source) => {
    const document = parse(source);
    const context = compileToIR(schema, document);
    generator.context = context;
    return context;
  };

  const addFragment = (fragment) => {
    this.generator.context.fragments[fragment.fragmentName] = fragment;
  };

  return { generator, compileFromSource, addFragment };
}

describe('Flow code generation', function() {
  describe('#generateSource()', function() {
    it(`should generate simple query operations`, function() {
      const { compileFromSource } = setup(swapiSchema);
      const context = compileFromSource(`
        query HeroName {
          hero {
            name
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        export type HeroNameQuery = {
          hero: ? {
            name: string,
          },
        };
      `);
    });

    it(`should generate simple query operations including input variables`, function() {
      const { compileFromSource } = setup(swapiSchema);
      const context = compileFromSource(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export type HeroNameQueryVariables = {
          episode: ?Episode,
        };

        export type HeroNameQuery = {
          hero: ? {
            name: string,
          },
        };
      `);
    });

    it(`should generate simple nested query operations including input variables`, function() {
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

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export type HeroAndFriendsNamesQueryVariables = {
          episode: ?Episode,
        };

        export type HeroAndFriendsNamesQuery = {
          hero: ? {
            name: string,
            friends: ?Array< {
              name: string,
            } >,
          },
        };
      `);
    });

    it(`should generate fragmented query operations`, function() {
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

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        export type HeroAndFriendsNamesQuery = {
          hero: ?(HeroFriendsFragment & {
            name: string,
          }),
        };

        export type HeroFriendsFragment = {
          friends: ?Array< {
            name: string,
          } >,
        };
      `);
    });

    it(`should generate query operations with inline fragments`, function() {
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

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        export type HeroAndDetailsQuery = {
          hero: ?(HeroDetailsFragment & {
            name: string,
          }),
        };

        export type HeroDetailsFragment = {
          primaryFunction: ?string,
          height: ?number,
        };
      `);
    });

    it(`should generate mutation operations with complex input types`, function() {
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

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export type ReviewInput = {
          // 0-5 stars
          stars: number,
          // Comment about the movie, optional
          commentary: ?string,
          // Favorite color, optional
          favorite_color: ?ColorInput,
        };

        export type ColorInput = {
          red: number,
          green: number,
          blue: number,
        };

        export type ReviewMovieMutationVariables = {
          episode: ?Episode,
          review: ?ReviewInput,
        };

        export type ReviewMovieMutation = {
          createReview: ? {
            stars: number,
            commentary: ?string,
          },
        };
      `);
    });

    it(`should generate correct list with custom fragment`, function() {
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

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export type HeroAndFriendsNamesQueryVariables = {
          episode: ?Episode,
        };

        export type HeroAndFriendsNamesQuery = {
          hero: ? {
            name: string,
            friends: Array<FriendFragment>,
          },
        };

        export type FriendFragment = {
          name: string,
        };
      `);
    });

    it(`should annotate custom scalars as string`, function() {
      const { compileFromSource } = setup(miscSchema);
      const context = compileFromSource(`
        query CustomScalar {
          misc {
            date
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        /* @flow */
        //  This file was automatically generated and should not be edited.

        export type CustomScalarQuery = {
          misc: ? {
            date: ?any,
          },
        };
      `);
    });
  });
});
