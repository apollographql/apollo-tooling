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
} from '../../src/typescript/codeGeneration';

import { loadSchema } from '../../src/loading';
const schema = loadSchema(require.resolve('../starwars/schema.json'));

import CodeGenerator from '../../src/utilities/CodeGenerator';

import { compileToIR } from '../../src/compilation';

describe('TypeScript code generation', function() {
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

  describe('#generateSource()', function() {
    it(`should generate simple query operations`, function() {
      const context = this.compileFromSource(`
        query HeroName {
          hero {
            name
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        //  This file was automatically generated and should not be edited.
        /* tslint:disable */

        export interface HeroNameQuery {
          hero: {
            name: string,
          } | null;
        }
        /* tslint:enable */

      `);
    });

    it(`should generate simple query operations including input variables`, function() {
      const context = this.compileFromSource(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        //  This file was automatically generated and should not be edited.
        /* tslint:disable */

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export interface HeroNameQueryVariables {
          episode: Episode | null;
        }

        export interface HeroNameQuery {
          hero: {
            name: string,
          } | null;
        }
        /* tslint:enable */

      `);
    });

    it(`should generate simple nested query operations including input variables`, function() {
      const context = this.compileFromSource(`
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
        //  This file was automatically generated and should not be edited.
        /* tslint:disable */

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export interface HeroAndFriendsNamesQueryVariables {
          episode: Episode | null;
        }

        export interface HeroAndFriendsNamesQuery {
          hero: {
            name: string,
            friends: Array< {
              name: string,
            } > | null,
          } | null;
        }
        /* tslint:enable */

      `);
    });

    it(`should generate fragmented query operations`, function() {
      const context = this.compileFromSource(`
        query HeroAndFriendsNames {
          hero {
            name
            ...HeroFriends
          }
        }

        fragment HeroFriends on Character {
          friends {
            name
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        //  This file was automatically generated and should not be edited.
        /* tslint:disable */

        export interface HeroAndFriendsNamesQuery {
          hero: HeroFriendsFragment & {
            name: string,
          } | null;
        }

        export interface HeroFriendsFragment {
          friends: Array< {
            name: string,
          } > | null;
        }
        /* tslint:enable */

      `);
    });

    it(`should generate query operations with inline fragments`, function() {
      const context = this.compileFromSource(`
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
        //  This file was automatically generated and should not be edited.
        /* tslint:disable */

        export interface HeroAndDetailsQuery {
          hero: HeroDetailsFragment & {
            name: string,
          } | null;
        }

        export interface HeroDetailsFragment {
          primaryFunction: string | null;
          height: number | null;
        }
        /* tslint:enable */

      `);
    });

    it(`should generate mutation operations with complex input types`, function() {
      const context = this.compileFromSource(`
        mutation ReviewMovie($episode: Episode, $review: ReviewInput) {
          createReview(episode: $episode, review: $review) {
            stars
            commentary
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        //  This file was automatically generated and should not be edited.
        /* tslint:disable */

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export interface ReviewInput {
          // 0-5 stars
          stars: number;
          // Comment about the movie, optional
          commentary: string | null;
          // Favorite color, optional
          favoriteColor: ColorInput | null;
        }

        export interface ColorInput {
          red: number;
          green: number;
          blue: number;
        }

        export interface ReviewMovieMutationVariables {
          episode: Episode | null;
          review: ReviewInput | null;
        }

        export interface ReviewMovieMutation {
          createReview: {
            stars: number,
            commentary: string | null,
          } | null;
        }
        /* tslint:enable */

      `);
    });

    it(`should generate correct list with custom fragment`, function() {
      const context = this.compileFromSource(`
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
        //  This file was automatically generated and should not be edited.
        /* tslint:disable */
        
        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE" | // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE" | // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.
        
        
        export interface HeroAndFriendsNamesQueryVariables {
          episode: Episode | null;
        }
        
        export interface HeroAndFriendsNamesQuery {
          hero: {
            name: string,
            friends: Array<FriendFragment>,
          } | null;
        }
        
        export interface FriendFragment {
          name: string;
        }
        /* tslint:enable */

      `);
    });
  });
});
