import { stripIndent } from 'common-tags'

import {
  parse,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import { loadSchema } from '../src/loading'

import { compileToIR } from '../src/compilation'
import { serializeAST } from '../src/serializeToJSON'

const schema = loadSchema(require.resolve('./starwars/schema.json'));

describe('Compiling query documents', () => {
  test(`should include variables defined in operations`, () => {
    const document = parse(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
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
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['HeroName']).variables).toMatchSnapshot();
    expect(filteredIR(operations['Search']).variables).toMatchSnapshot();
    expect(filteredIR(operations['CreateReviewForEpisode']).variables).toMatchSnapshot();
  });

  test(`should keep track of enums and input object types used in variables`, () => {
    const document = parse(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }

      query Search($text: String) {
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
    `);

    const { typesUsed } = compileToIR(schema, document);

    expect(filteredIR(typesUsed)).toEqual(['Episode', 'ReviewInput', 'ColorInput']);
  });

  test(`should keep track of enums used in fields`, () => {
    const document = parse(`
      query Hero {
        hero {
          name
          appearsIn
        }

        droid(id: "2001") {
          appearsIn
        }
      }
    `);

    const { typesUsed } = compileToIR(schema, document);

    expect(filteredIR(typesUsed)).toEqual(['Episode']);
  });

  test(`should keep track of types used in fields of input objects`, () => {
    const bookstore_schema = loadSchema(require.resolve('./bookstore/schema.json'));
    const document = parse(`
      query ListBooks {
        books {
          id name writtenBy { author { id name } }
        }
      }

      mutation CreateBook($book: BookInput!) {
        createBook(book: $book) {
          id, name, writtenBy { author { id name } }
        }
      }

      query ListPublishers {
        publishers {
          id name
        }
      }

      query ListAuthors($publishedBy: PublishedByInput!) {
        authors(publishedBy: $publishedBy) {
          id name publishedBy { publisher { id name } }
        }
      }
    `)

    const { typesUsed } = compileToIR(bookstore_schema, document);
    expect(filteredIR(typesUsed)).toContain('IdInput');
    expect(filteredIR(typesUsed)).toContain('WrittenByInput');
  });

  test(`should include the original field name for an aliased field`, () => {
    const document = parse(`
      query HeroName {
        r2: hero {
          name
        }
        luke: hero(episode: EMPIRE) {
          name
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroName'].fields[0].fieldName).toBe("hero");
  });

  test(`should include field arguments`, () => {
    const document = parse(`
      query HeroName {
        hero(episode: EMPIRE) {
          name
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroName'].fields[0].args)
      .toEqual([{ name: "episode", value: "EMPIRE" }]);
  });

  test(`should include isOptional if a field has skip or include directives`, () => {
    const document = parse(`
      query HeroNameConditionalInclusion {
        hero {
          name @include(if: false)
        }
      }

      query HeroNameConditionalExclusion {
        hero {
          name @skip(if: true)
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['HeroNameConditionalInclusion'])).toMatchSnapshot();
    expect(filteredIR(operations['HeroNameConditionalExclusion'])).toMatchSnapshot();
  });

  test(`should recursively flatten inline fragments with type conditions that match the parent type`, () => {
    const document = parse(`
      query Hero {
        hero {
          id
          ... on Character {
            name
            ... on Character {
              id
              appearsIn
            }
            id
          }
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['Hero'])).toMatchSnapshot();
  });

  test(`should recursively include fragment spreads with type conditions that match the parent type`, () => {
    const document = parse(`
      query Hero {
        hero {
          id
          ...HeroDetails
        }
      }

      fragment HeroDetails on Character {
        id
        ...MoreHeroDetails
        name
      }

      fragment MoreHeroDetails on Character {
        appearsIn
        id
      }
    `);

    const { operations, fragments } = compileToIR(schema, document);

    expect(filteredIR(operations['Hero'])).toMatchSnapshot();
    expect(filteredIR(fragments['HeroDetails'])).toMatchSnapshot();
    expect(filteredIR(fragments['MoreHeroDetails'])).toMatchSnapshot();
  });

  test(`should include fragment spreads from subselections`, () => {
    const document = parse(`
      query HeroAndFriends {
        hero {
          ...HeroDetails
          appearsIn
          id
          friends {
            id
            ...HeroDetails
          }
        }
      }

      fragment HeroDetails on Character {
      	name
        id
      }
    `);

    const { operations, fragments } = compileToIR(schema, document);

    expect(filteredIR(operations['HeroAndFriends'])).toMatchSnapshot();
    expect(filteredIR(fragments['HeroDetails'])).toMatchSnapshot();
  });

  test(`should include type conditions with merged fields for inline fragments`, () => {
    const document = parse(`
      query Hero {
        hero {
          name
          ... on Droid {
            primaryFunction
          }
          ... on Human {
            height
          }
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['Hero'])).toMatchSnapshot();
  });

  test(`should include fragment spreads with type conditions`, () => {
    const document = parse(`
      query Hero {
        hero {
          name
          ...DroidDetails
          ...HumanDetails
        }
      }

      fragment DroidDetails on Droid {
        primaryFunction
      }

      fragment HumanDetails on Human {
        height
      }
    `);

    const { operations, fragments } = compileToIR(schema, document);

    expect(filteredIR(operations['Hero'])).toMatchSnapshot();
    expect(filteredIR(fragments['DroidDetails'])).toMatchSnapshot();
    expect(filteredIR(fragments['HumanDetails'])).toMatchSnapshot();
  });

  test(`should not include type conditions for fragment spreads with type conditions that match the parent type`, () => {
    const document = parse(`
      query Hero {
        hero {
          name
          ...HeroDetails
        }
      }

      fragment HeroDetails on Character {
        name
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['Hero'])).toMatchSnapshot();
  });

  test(`should include type conditions for inline fragments in fragments`, () => {
    const document = parse(`
      query Hero {
        hero {
          ...HeroDetails
        }
      }

      fragment HeroDetails on Character {
        name
        ... on Droid {
          primaryFunction
        }
        ... on Human {
          height
        }
      }
    `);

    const { operations, fragments } = compileToIR(schema, document);

    expect(filteredIR(operations['Hero'])).toMatchSnapshot();
    expect(filteredIR(fragments['HeroDetails'])).toMatchSnapshot();
  });

  test(`should inherit type condition when nesting an inline fragment in an inline fragment with a more specific type condition`, () => {
    const document = parse(`
      query HeroName {
        hero {
          ... on Droid {
            ... on Character {
              name
            }
          }
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['HeroName'])).toMatchSnapshot();
  });

  test(`should not inherit type condition when nesting an inline fragment in an inline fragment with a less specific type condition`, () => {
    const document = parse(`
      query HeroName {
        hero {
          ... on Character {
            ... on Droid {
              name
            }
          }
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['HeroName'])).toMatchSnapshot();
  });

  test(`should inherit type condition when nesting a fragment spread in an inline fragment with a more specific type condition`, () => {
    const document = parse(`
      query HeroName {
        hero {
          ... on Droid {
            ...HeroName
          }
        }
      }

      fragment HeroName on Character {
        name
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['HeroName'])).toMatchSnapshot();
  });

  test(`should ignore a fragment's inline fragments whose type conditions do not match more specific effective type`, () => {
    const document = parse(`
      fragment CharacterFragment on Character {
        ... on Droid {
          primaryFunction
        }
        ... on Human {
          height
        }
      }

      query HumanAndDroid {
        human(id: "human") {
          ...CharacterFragment
        }
        droid(id: "droid") {
          ...CharacterFragment
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['HumanAndDroid'])).toMatchSnapshot();
  });

  test(`should not inherit type condition when nesting a fragment spread in an inline fragment with a less specific type condition`, () => {
    const document = parse(`
      query HeroName {
        hero {
          ... on Character {
            ...DroidName
          }
        }
      }

      fragment DroidName on Droid {
        name
      }
    `);

    const { operations } = compileToIR(schema, document);
    expect(filteredIR(operations['HeroName'])).toMatchSnapshot();
  });

  test(`should include type conditions for inline fragments on a union type`, () => {
    const document = parse(`
      query Search {
        search(text: "an") {
          ... on Character {
            name
          }
          ... on Droid {
            primaryFunction
          }
          ... on Human {
            height
          }
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(filteredIR(operations['Search']).fields[0].inlineFragments).toMatchSnapshot();
  });

  test(`should keep track of fragments referenced in a subselection`, () => {
    const document = parse(`
      query HeroAndFriends {
        hero {
          name
          friends {
            ...HeroDetails
          }
        }
      }

      fragment HeroDetails on Character {
        name
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroAndFriends'].fragmentsReferenced).toEqual(['HeroDetails']);
  });

  test(`should keep track of fragments referenced in a fragment within a subselection`, () => {
    const document = parse(`
      query HeroAndFriends {
        hero {
          ...HeroDetails
        }
      }

      fragment HeroDetails on Character {
        friends {
          ...HeroName
        }
      }

      fragment HeroName on Character {
        name
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroAndFriends'].fragmentsReferenced).toEqual(['HeroDetails', 'HeroName']);
  });

  test(`should keep track of fragments referenced in a subselection nested in an inline fragment`, () => {
    const document = parse(`
      query HeroAndFriends {
        hero {
          name
          ... on Droid {
            friends {
              ...HeroDetails
            }
          }
        }
      }

      fragment HeroDetails on Character {
        name
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroAndFriends'].fragmentsReferenced).toEqual(['HeroDetails']);
  });

  test(`should include the source of operations with __typename added for abstract types`, () => {
    const source = stripIndent`
      query HeroName {
        hero {
          name
        }
      }
    `
    const document = parse(source);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroName'].source).toMatchSnapshot();
  });

  test(`should include the source of fragments with __typename added for abstract types`, () => {
    const source = stripIndent`
      fragment HeroDetails on Character {
        name
      }
    `
    const document = parse(source);

    const { fragments } = compileToIR(schema, document);

    expect(fragments['HeroDetails'].source).toBe(stripIndent`
      fragment HeroDetails on Character {
        __typename
        name
      }
    `);
  });

  test(`should include the operationType for a query`, () => {
    const source = stripIndent`
      query HeroName {
        hero {
          name
        }
      }
    `
    const document = parse(source);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroName'].operationType).toBe('query');
  });

  test(`should include the operationType for a mutation`, () => {
    const source = stripIndent`
      mutation CreateReview {
        createReview {
          stars
          commentary
        }
      }
    `
    const document = parse(source);

    const { operations } = compileToIR(schema, document);

    expect(operations['CreateReview'].operationType).toBe('mutation');
  });
});

function filteredIR(ir) {
  return JSON.parse(serializeAST(ir), function(key, value) {
    if (key === 'source') {
      return undefined;
    }
    return value;
  });
}
