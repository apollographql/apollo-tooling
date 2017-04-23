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
    test(`should generate simple query operations`, function() {
      const context = this.compileFromSource(`
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
      const context = this.compileFromSource(`
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
      expect(source).toMatchSnapshot();
    });

    test(`should generate fragmented query operations`, function() {
      const context = this.compileFromSource(`
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
      expect(source).toMatchSnapshot();
    });

    test(`should generate mutation operations with complex input types`, function() {
      const context = this.compileFromSource(`
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
      expect(source).toMatchSnapshot();
    });
  });
});
