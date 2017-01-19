import chai, { expect } from 'chai'
import chaiSubset from 'chai-subset'
chai.use(chaiSubset);

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
  it(`should include variables defined in operations`, () => {
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

    expect(filteredIR(operations['HeroName']).variables).to.deep.equal(
      [
        { name: 'episode', type: 'Episode' }
      ]
    );

    expect(filteredIR(operations['Search']).variables).to.deep.equal(
      [
        { name: 'text', type: 'String!' }
      ]
    );

    expect(filteredIR(operations['CreateReviewForEpisode']).variables).to.deep.equal(
      [
        { name: 'episode', type: 'Episode!' },
        { name: 'review', type: 'ReviewInput!' }
      ]
    );
  });

  it(`should keep track of enums and input object types used in variables`, () => {
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

    expect(filteredIR(typesUsed)).to.deep.equal(['Episode', 'ReviewInput', 'ColorInput']);
  });

  it(`should keep track of enums used in fields`, () => {
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

    expect(filteredIR(typesUsed)).to.deep.equal(['Episode']);
  });

  it(`should keep track of types used in fields of input objects`, () => {
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
    expect(filteredIR(typesUsed)).to.deep.include('IdInput');
    expect(filteredIR(typesUsed)).to.deep.include('WrittenByInput');
  });

  it(`should include the original field name for an aliased field`, () => {
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

    expect(operations['HeroName'].fields[0].fieldName).to.equal("hero");
  });

  it(`should include field arguments`, () => {
    const document = parse(`
      query HeroName {
        hero(episode: EMPIRE) {
          name
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroName'].fields[0].args)
      .to.deep.equal([{ name: "episode", value: "EMPIRE" }]);
  });

  it(`should include isOptional if a field has skip or include directives`, () => {
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

    expect(filteredIR(operations['HeroNameConditionalInclusion'])).to.deep.equal({
      operationName: 'HeroNameConditionalInclusion',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!',
              isConditional: true
            },
          ],
          fragmentSpreads: [],
          inlineFragments: []
        }
      ]
    });

    expect(filteredIR(operations['HeroNameConditionalExclusion'])).to.deep.equal({
      operationName: 'HeroNameConditionalExclusion',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!',
              isConditional: true
            },
          ],
          fragmentSpreads: [],
          inlineFragments: []
        }
      ]
    });
  });

  it(`should recursively flatten inline fragments with type conditions that match the parent type`, () => {
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

    expect(filteredIR(operations['Hero'])).to.deep.equal({
      operationName: 'Hero',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [
            {
              responseName: 'id',
              fieldName: 'id',
              type: 'ID!'
            },
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!'
            },
            {
              responseName: 'appearsIn',
              fieldName: 'appearsIn',
              type: '[Episode]!'
            }
          ],
          fragmentSpreads: [],
          inlineFragments: []
        }
      ]
    });
  });

  it(`should recursively include fragment spreads with type conditions that match the parent type`, () => {
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

    expect(filteredIR(operations['Hero'])).to.deep.equal({
      operationName: 'Hero',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: ['HeroDetails', 'MoreHeroDetails'],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [
            {
              responseName: 'id',
              fieldName: 'id',
              type: 'ID!'
            }
          ],
          fragmentSpreads: ['HeroDetails', 'MoreHeroDetails'],
          inlineFragments: [],
        }
      ],
    });

    expect(filteredIR(fragments['HeroDetails'])).to.deep.equal({
      fragmentName: 'HeroDetails',
      typeCondition: 'Character',
      fragmentsReferenced: ['MoreHeroDetails'],
      fields: [
        {
          responseName: 'id',
          fieldName: 'id',
          type: 'ID!'
        },
        {
          responseName: 'name',
          fieldName: 'name',
          type: 'String!'
        }
      ],
      fragmentSpreads: ['MoreHeroDetails'],
      inlineFragments: []
    });

    expect(filteredIR(fragments['MoreHeroDetails'])).to.deep.equal({
      fragmentName: 'MoreHeroDetails',
      typeCondition: 'Character',
      fragmentsReferenced: [],
      fields: [
        { responseName: 'appearsIn',
          fieldName: 'appearsIn',
          type: '[Episode]!'
        },
        {
          responseName: 'id',
          fieldName: 'id',
          type: 'ID!'
        }
      ],
      fragmentSpreads: [],
      inlineFragments: []
    });
  });

  it(`should include fragment spreads from subselections`, () => {
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

    expect(filteredIR(operations['HeroAndFriends'])).to.deep.equal({
      operationName: 'HeroAndFriends',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: ['HeroDetails'],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [
            { responseName: 'appearsIn',
              fieldName: 'appearsIn',
              type: '[Episode]!'
            },
            {
              responseName: 'id',
              fieldName: 'id',
              type: 'ID!'
            },
            {
              responseName: 'friends',
              fieldName: 'friends',
              type: '[Character]',
              fields: [
                {
                  responseName: 'id',
                  fieldName: 'id',
                  type: 'ID!'
                }
              ],
              fragmentSpreads: ['HeroDetails'],
              inlineFragments: []
            }
          ],
          fragmentSpreads: ['HeroDetails'],
          inlineFragments: []
        }
      ]
    });

    expect(filteredIR(fragments['HeroDetails'])).to.deep.equal({
      fragmentName: 'HeroDetails',
      typeCondition: 'Character',
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'name',
          fieldName: 'name',
          type: 'String!'
        },
        {
          responseName: 'id',
          fieldName: 'id',
          type: 'ID!'
        }
      ],
      fragmentSpreads: [],
      inlineFragments: []
    });
  });

  it(`should include type conditions with merged fields for inline fragments`, () => {
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

    expect(filteredIR(operations['Hero'])).to.deep.equal({
      operationName: 'Hero',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!'
            }
          ],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  responseName: 'name',
                  fieldName: 'name',
                  type: 'String!'
                },
                {
                  responseName: 'primaryFunction',
                  fieldName: 'primaryFunction',
                  type: 'String'
                },
              ],
              fragmentSpreads: []
            },
            {
              typeCondition: 'Human',
              fields: [
                {
                  responseName: 'name',
                  fieldName: 'name',
                  type: 'String!'
                },
                {
                  responseName: 'height',
                  fieldName: 'height',
                  type: 'Float'
                },
              ],
              fragmentSpreads: []
            }
          ]
        }
      ]
    });
  });

  it(`should include fragment spreads with type conditions`, () => {
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

    expect(filteredIR(operations['Hero'])).to.deep.equal({
      operationName: 'Hero',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: ['DroidDetails', 'HumanDetails'],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fragmentSpreads: ['DroidDetails', 'HumanDetails'],
          fields: [
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!'
            }
          ],
          inlineFragments: []
        }
      ]
    });

    expect(filteredIR(fragments['DroidDetails'])).to.deep.equal({
      fragmentName: 'DroidDetails',
      typeCondition: 'Droid',
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'primaryFunction',
          fieldName: 'primaryFunction',
          type: 'String'
        }
      ],
      fragmentSpreads: [],
      inlineFragments: []
    });

    expect(filteredIR(fragments['HumanDetails'])).to.deep.equal({
      fragmentName: 'HumanDetails',
      typeCondition: 'Human',
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'height',
          fieldName: 'height',
          type: 'Float'
        }
      ],
      fragmentSpreads: [],
      inlineFragments: []
    });
  });

  it(`should not include type conditions for fragment spreads with type conditions that match the parent type`, () => {
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

    expect(filteredIR(operations['Hero'])).to.deep.equal({
      operationName: 'Hero',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: ['HeroDetails'],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fragmentSpreads: ['HeroDetails'],
          fields: [
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!'
            }
          ],
          inlineFragments: []
        }
      ],
    });
  });

  it(`should include type conditions for inline fragments in fragments`, () => {
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

    expect(filteredIR(operations['Hero'])).to.deep.equal({
      operationName: 'Hero',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: ['HeroDetails'],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [],
          fragmentSpreads: ['HeroDetails'],
          inlineFragments: []
        }
      ]
    });

    expect(filteredIR(fragments['HeroDetails'])).to.deep.equal({
      fragmentName: 'HeroDetails',
      typeCondition: 'Character',
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'name',
          fieldName: 'name',
          type: 'String!'
        }
      ],
      fragmentSpreads: [],
      inlineFragments: [
        {
          typeCondition: 'Droid',
          fields: [
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!'
            },
            {
              responseName: 'primaryFunction',
              fieldName: 'primaryFunction',
              type: 'String'
            },
          ],
          fragmentSpreads: []
        },
        {
          typeCondition: 'Human',
          fields: [
            {
              responseName: 'name',
              fieldName: 'name',
              type: 'String!'
            },
            {
              responseName: 'height',
              fieldName: 'height',
              type: 'Float'
            },
          ],
          fragmentSpreads: []
        }
      ]
    });
  });

  it(`should inherit type condition when nesting an inline fragment in an inline fragment with a more specific type condition`, () => {
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

    expect(filteredIR(operations['HeroName'])).to.deep.equal({
      operationName: 'HeroName',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  responseName: 'name',
                  fieldName: 'name',
                  type: 'String!'
                }
              ],
              fragmentSpreads: []
            }
          ]
        }
      ]
    });
  });

  it(`should not inherit type condition when nesting an inline fragment in an inline fragment with a less specific type condition`, () => {
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

    expect(filteredIR(operations['HeroName'])).to.deep.equal({
      operationName: 'HeroName',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  responseName: 'name',
                  fieldName: 'name',
                  type: 'String!'
                }
              ],
              fragmentSpreads: [],
            }
          ]
        }
      ]
    });
  });

  it(`should inherit type condition when nesting a fragment spread in an inline fragment with a more specific type condition`, () => {
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

    expect(filteredIR(operations['HeroName'])).to.deep.equal({
      operationName: 'HeroName',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: ['HeroName'],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fragmentSpreads: ['HeroName'],
              fields: [],
            }
          ]
        }
      ]
    });
  });

  it(`should not inherit type condition when nesting a fragment spread in an inline fragment with a less specific type condition`, () => {
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

    expect(filteredIR(operations['HeroName'])).to.deep.equal({
      operationName: 'HeroName',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: ['DroidName'],
      fields: [
        {
          responseName: 'hero',
          fieldName: 'hero',
          type: 'Character',
          fields: [],
          fragmentSpreads: ['DroidName'],
          inlineFragments: []
        }
      ]
    });
  });

  it(`should include type conditions for inline fragments on a union type`, () => {
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

    expect(filteredIR(operations['Search']).fields[0].inlineFragments).to.deep.equal([
      {
        typeCondition: 'Droid',
        fields: [
          {
            responseName: 'name',
            fieldName: 'name',
            type: 'String!'
          },
          {
            responseName: 'primaryFunction',
            fieldName: 'primaryFunction',
            type: 'String'
          },
        ],
        fragmentSpreads: [],
      },
      {
        typeCondition: 'Human',
        fields: [
          {
            responseName: 'name',
            fieldName: 'name',
            type: 'String!'
          },
          {
            responseName: 'height',
            fieldName: 'height',
            type: 'Float'
          },
        ],
        fragmentSpreads: [],
      }
    ]);
  });

  it(`should keep track of fragments referenced in a subselection`, () => {
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

    expect(operations['HeroAndFriends'].fragmentsReferenced).to.deep.equal(['HeroDetails']);
  });

  it(`should keep track of fragments referenced in a fragment within a subselection`, () => {
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

    expect(operations['HeroAndFriends'].fragmentsReferenced).to.deep.equal(['HeroDetails', 'HeroName']);
  });

  it(`should keep track of fragments referenced in a subselection nested in an inline fragment`, () => {
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

    expect(operations['HeroAndFriends'].fragmentsReferenced).to.deep.equal(['HeroDetails']);
  });

  it(`should include the source of operations with __typename added for abstract types`, () => {
    const source = stripIndent`
      query HeroName {
        hero {
          name
        }
      }
    `
    const document = parse(source);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroName'].source).to.equal(stripIndent`
      query HeroName {
        hero {
          __typename
          name
        }
      }
    `);
  });

  it(`should include the source of fragments with __typename added for abstract types`, () => {
    const source = stripIndent`
      fragment HeroDetails on Character {
        name
      }
    `
    const document = parse(source);

    const { fragments } = compileToIR(schema, document);

    expect(fragments['HeroDetails'].source).to.equal(stripIndent`
      fragment HeroDetails on Character {
        __typename
        name
      }
    `);
  });

  it(`should include the operationType for a query`, () => {
    const source = stripIndent`
      query HeroName {
        hero {
          name
        }
      }
    `
    const document = parse(source);

    const { operations } = compileToIR(schema, document);

    expect(operations['HeroName'].operationType).to.equal('query');
  });

  it(`should include the operationType for a mutation`, () => {
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

    expect(operations['CreateReview'].operationType).to.equal('mutation');
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
