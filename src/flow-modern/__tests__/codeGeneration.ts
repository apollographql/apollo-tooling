import { parse, GraphQLNonNull, GraphQLString, GraphQLEnumType, GraphQLList } from 'graphql';

import { loadSchema } from '../../loading';
const schema = loadSchema(require.resolve('../../../test/fixtures/starwars/schema.json'));

import {
  compileToIR,
  CompilerOptions,
  CompilerContext,
  SelectionSet,
  Field,
  Argument
} from '../../compiler';

import { generateSource } from '../codeGeneration';

function compile(
  source: string,
  options: CompilerOptions = {
    mergeInFieldsFromFragmentSpreads: true,
    addTypename: true
  }
): CompilerContext {
  const document = parse(source);
  return compileToIR(schema, document, options);
}

describe('Flow codeGeneration', () => {
  test('simple hero query', () => {
    const context = compile(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
          id
        }
      }
    `);
    const output = generateSource(context);
    expect(output).toMatchSnapshot();
  });

  test('inline fragments', () => {
    const context = compile(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
          id

          ... on Human {
            homePlanet
            friends {
              name
            }
          }

          ... on Droid {
            appearsIn
          }
        }
      }
    `);
    const output = generateSource(context);
    expect(output).toMatchSnapshot();
  });

  test('fragment spreads', () => {
    const context = compile(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
          id
          ...humanFragment
          ...droidFragment
        }
      }

      fragment humanFragment on Human {
        homePlanet
        friends {
          ... on Human {
            name
          }

          ... on Droid {
            id
          }
        }
      }

      fragment droidFragment on Droid {
        appearsIn
      }
    `);
    const output = generateSource(context);
    expect(output).toMatchSnapshot();
  });

  test.only(`should generate mutation operations with complex input types`, function() {
    const context = compile(`
      mutation ReviewMovie($episode: Episode, $review: ReviewInput) {
        createReview(episode: $episode, review: $review) {
          stars
          commentary
        }
      }
    `);

    const output = generateSource(context);
    console.log(output);
    expect(output).toMatchSnapshot();
  });
});
