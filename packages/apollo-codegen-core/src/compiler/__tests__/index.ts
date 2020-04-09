import { parse } from "graphql";

import { loadSchema } from "../../loading";

import { compileToIR } from "../";

const schema = loadSchema(
  require.resolve("../../../../../__fixtures__/starwars/schema.json")
);

describe("Compiling query documents to modern IR with typeNodes", () => {
  it(`should print IR with typeNodes on fields`, () => {
    const document = parse(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
          ...withId
        }
      }

      query Search($text: String!) {
        search(text: $text) {
          ... on Character {
            name
          }
        }
      }

      mutation CreateReviewForEpisode($episode: Episode!, $review: ReviewInput!) {
        createReview(episode: $episode, review: $review) {
          stars
          commentary
        }
      }

      fragment withId on Character {
        id
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(
      operations["HeroName"].selectionSet.selections[0].selectionSet
        .selections[0].typeNode
    ).toEqual({
      kind: "NonNullType",
      type: {
        kind: "NamedType",
        name: {
          kind: "Name",
          value: "String"
        }
      }
    });

    expect(operations["HeroName"].variables[0].typeNode).toEqual({
      kind: "NamedType",
      name: {
        kind: "Name",
        value: "Episode"
      }
    });

    expect(operations["Search"].variables[0].typeNode).toEqual({
      kind: "NonNullType",
      type: {
        kind: "NamedType",
        name: {
          kind: "Name",
          value: "String"
        }
      }
    });

    expect(
      operations["Search"].selectionSet.selections[0].selectionSet.selections[0]
        .typeNode
    ).toEqual({
      kind: "NamedType",
      name: { kind: "Name", value: "Character" }
    });

    expect(
      operations["CreateReviewForEpisode"].selectionSet.selections[0]
        .selectionSet.selections[0].typeNode
    ).toEqual({
      kind: "NonNullType",
      type: { kind: "NamedType", name: { kind: "Name", value: "Int" } }
    });
  });
});
