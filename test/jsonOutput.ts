import { GraphQLSchema, buildSchema, parse } from 'graphql';
import { compileToLegacyIR } from '../src/compiler/legacyIR';
import serializeToJSON from '../src/serializeToJSON';

import { loadSchema } from '../src/loading';
const starWarsSchema = loadSchema(require.resolve('./fixtures/starwars/schema.json'));

function compileFromSource(source: string, schema: GraphQLSchema = starWarsSchema) {
  const document = parse(source);
  return compileToLegacyIR(schema, document, {
    mergeInFieldsFromFragmentSpreads: false,
    addTypename: true
  });
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
          id
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

  test.only(`should generate JSON output for an input object type with default field values`, function() {
    const schema = buildSchema(`
      type Query {
        someField(input: ComplexInput!): String!
      }

      input ComplexInput {
        string: String = "Hello"
        customScalar: Date = "2017-04-16"
        listOfString: [String] = ["test1", "test2", "test3"]
        listOfInt: [Int] = [1, 2, 3]
        listOfEnums: [Episode] = [JEDI, EMPIRE]
        listOfCustomScalar: [Date] = ["2017-04-16", "2017-04-17", "2017-04-18"]
      }

      scalar Date

      enum Episode {
        NEWHOPE
        EMPIRE
        JEDI
      }
    `);

    const context = compileFromSource(
      `
      query QueryWithComplexInput($input: ComplexInput) {
        someField(input: $input)
      }
      `,
      schema
    );

    const output = serializeToJSON(context);

    expect(output).toMatchSnapshot();
  });
});
