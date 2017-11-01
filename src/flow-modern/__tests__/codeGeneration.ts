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
  options: CompilerOptions = { mergeInFieldsFromFragmentSpreads: true }
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
        }
      }
    `);
    const output = generateSource(context);

    console.log(output);
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
  });
});
