import { parse } from 'graphql';
import { compileToLegacyIR, CompilerOptions } from '../src/compiler/legacyIR';
import serializeToJSON from '../src/serializeToJSON';

import { loadSchema } from '../src/loading';
const schema = loadSchema(require.resolve('./starwars/schema.json'));

function compileFromSource(
  source,
  options: CompilerOptions = {
    mergeInFieldsFromFragmentSpreads: false,
    addTypename: true
  }
) {
  const document = parse(source);
  return compileToLegacyIR(schema, document, options);
}

describe('JSON output', function() {
  test(`should generate JSON output for a query with an enum variable`, function() {
    const context = compileFromSource(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }
    `);

    const output = serializeToJSON(context);

    expect(output).toMatchSnapshot();
  });

  test(`should generate JSON output for a query with a nested selection set`, function() {
    const context = compileFromSource(`
      query HeroAndFriendsNames {
        hero {
          name
          friends {
            name
          }
        }
      }
    `);

    const output = serializeToJSON(context);

    expect(output).toMatchSnapshot();
  });

  test(`should generate JSON output for a query with a fragment spread and nested inline fragments`, function() {
    const context = compileFromSource(`
      query HeroAndDetails {
        hero {
          name
          ...CharacterDetails
        }
      }

      fragment CharacterDetails on Character {
        name
        ... on Droid {
          primaryFunction
        }
        ... on Human {
          height
        }
      }
    `);

    const output = serializeToJSON(context);

    expect(output).toMatchSnapshot();
  });

  test(`should generate JSON output for a mutation with an enum and an input object variable`, function() {
    const context = compileFromSource(`
      mutation CreateReview($episode: Episode, $review: ReviewInput) {
        createReview(episode: $episode, review: $review) {
          stars
          commentary
        }
      }
    `);

    const output = serializeToJSON(context);

    expect(output).toMatchSnapshot();
  });
});
