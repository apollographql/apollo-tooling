import { GraphQLSchema, buildSchema, parse, GraphQLUnionType } from "graphql";
import { compileToLegacyIR } from "../compiler/legacyIR";
import serializeToJSON from "../serializeToJSON";

import { loadSchema } from "../loading";
const starWarsSchema = loadSchema(
  require.resolve("../../../../__fixtures__/starwars/schema.json")
);

function compileFromSource(
  source: string,
  schema: GraphQLSchema = starWarsSchema
) {
  const document = parse(source);
  return compileToLegacyIR(schema, document, {
    mergeInFieldsFromFragmentSpreads: false,
    addTypename: true
  });
}

describe("JSON output", function() {
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

  test(`should generate JSON output for an input object type with default field values`, function() {
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

  test(`should generate JSON output for a subscription`, function() {
    const schema = buildSchema(`
      type Comment {
        id: Int!
        content: String!
        repoName: String!
      }

      type Subscription {
        commentAdded(repoFullName: String!): Comment
      }
    `);

    const context = compileFromSource(
      `
      subscription CommentAdded($repoFullName: ID!) {
        commentAdded(repoFullName: $repoFullName) {
          id
          content
        }
      }
      `,
      schema
    );

    const output = serializeToJSON(context);

    expect(output).toMatchSnapshot();
  });

  test("should list all unions and their types under a `unionTypes` property", function() {
    const context = compileFromSource(`
      query Search {
        search(text: "an") {
          __typename
          ... on Human {
            name
            height
          }
          ... on Droid {
            name
            primaryFunction
          }
          ... on Starship {
            name
            length
          }
        }
      }
    `);

    expect(context.unionTypes.length).toBe(1);
    const type = context.unionTypes[0] as GraphQLUnionType;
    expect(type.name).toBe("SearchResult");
    expect(type.getTypes().length).toBe(3);

    const output = serializeToJSON(context);
    expect(output).toMatchSnapshot();
  });

  test("should list all interfaces and their implementing types under a `interfaceTypes` property", function() {
    const context = compileFromSource(`
      query HeroForEpisode {
        hero(episode: JEDI) {
          name
          ... on Droid {
            primaryFunction
          }
        }
      }
    `);

    expect(context.interfaceTypes.size).toBe(1);
    const [
      interfaceType,
      implementors
    ] = context.interfaceTypes.entries().next().value;
    expect(interfaceType.toString()).toBe("Character");
    expect(implementors.length).toBe(2);

    const output = serializeToJSON(context);
    expect(output).toMatchSnapshot();
  });
});
