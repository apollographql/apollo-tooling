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

import { compileToIR, stringifyIR, printIR } from '../src/compilation'

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

    expect(filteredIR(typesUsed)).to.deep.equal(['Episode', 'ReviewInput']);
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
          name: 'hero',
          type: 'Character',
          fields: [
            {
              name: 'id',
              type: 'ID!'
            },
            {
              name: 'name',
              type: 'String!'
            },
            {
              name: 'appearsIn',
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
          name: 'hero',
          type: 'Character',
          fields: [
            {
              name: 'id',
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
      fields: [
        {
          name: 'id',
          type: 'ID!'
        },
        {
          name: 'name',
          type: 'String!'
        }
      ],
      fragmentSpreads: ['MoreHeroDetails'],
      inlineFragments: []
    });

    expect(filteredIR(fragments['MoreHeroDetails'])).to.deep.equal({
      fragmentName: 'MoreHeroDetails',
      typeCondition: 'Character',
      fields: [
        { name: 'appearsIn',
          type: '[Episode]!'
        },
        {
          name: 'id',
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
          name: 'hero',
          type: 'Character',
          fields: [
            { name: 'appearsIn',
              type: '[Episode]!'
            },
            {
              name: 'id',
              type: 'ID!'
            },
            {
              name: 'friends',
              type: '[Character]',
              fields: [
                {
                  name: 'id',
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
      fields: [
        {
          name: 'name',
          type: 'String!'
        },
        {
          name: 'id',
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
          name: 'hero',
          type: 'Character',
          fields: [
            {
              name: 'name',
              type: 'String!'
            }
          ],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  name: 'name',
                  type: 'String!'
                },
                {
                  name: 'primaryFunction',
                  type: 'String'
                },
              ],
              fragmentSpreads: []
            },
            {
              typeCondition: 'Human',
              fields: [
                {
                  name: 'name',
                  type: 'String!'
                },
                {
                  name: 'height',
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
          name: 'hero',
          type: 'Character',
          fragmentSpreads: ['DroidDetails', 'HumanDetails'],
          fields: [
            {
              name: 'name',
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
      fields: [
        {
          name: 'primaryFunction',
          type: 'String'
        }
      ],
      fragmentSpreads: [],
      inlineFragments: []
    });

    expect(filteredIR(fragments['HumanDetails'])).to.deep.equal({
      fragmentName: 'HumanDetails',
      typeCondition: 'Human',
      fields: [
        {
          name: 'height',
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
          name: 'hero',
          type: 'Character',
          fragmentSpreads: ['HeroDetails'],
          fields: [
            {
              name: 'name',
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
          name: 'hero',
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
      fields: [
        {
          name: 'name',
          type: 'String!'
        }
      ],
      fragmentSpreads: [],
      inlineFragments: [
        {
          typeCondition: 'Droid',
          fields: [
            {
              name: 'name',
              type: 'String!'
            },
            {
              name: 'primaryFunction',
              type: 'String'
            },
          ],
          fragmentSpreads: []
        },
        {
          typeCondition: 'Human',
          fields: [
            {
              name: 'name',
              type: 'String!'
            },
            {
              name: 'height',
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
          name: 'hero',
          type: 'Character',
          fields: [],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  name: 'name',
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
          name: 'hero',
          type: 'Character',
          fields: [],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  name: 'name',
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
          name: 'hero',
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
          name: 'hero',
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

    expect(filteredIR(operations['Search'])).to.deep.equal({
      operationName: 'Search',
      operationType: 'query',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'search',
          type: '[SearchResult]',
          fields: [],
          fragmentSpreads: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  name: 'name',
                  type: 'String!'
                },
                {
                  name: 'primaryFunction',
                  type: 'String'
                },
              ],
              fragmentSpreads: [],
            },
            {
              typeCondition: 'Human',
              fields: [
                {
                  name: 'name',
                  type: 'String!'
                },
                {
                  name: 'height',
                  type: 'Float'
                },
              ],
              fragmentSpreads: [],
            }
          ]
        }
      ]
    });
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
  return JSON.parse(stringifyIR(ir), function(key, value) {
    if (key === 'source') {
      return undefined;
    }
    return value;
  });
}
