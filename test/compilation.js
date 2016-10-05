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
  it(`should include defined variables`, () => {
    const document = parse(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(stringifyAndParseIR(operations['HeroName'])).to.containSubset({
      operationName: 'HeroName',
      variables: [
        { name: 'episode', type: 'Episode' }
      ]
    });
  });

  it(`should keep track of types used in variables`, () => {
    const document = parse(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }
    `);

    const { typesUsed } = compileToIR(schema, document);

    expect(stringifyAndParseIR(typesUsed)).to.deep.equal(['Episode']);
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

    expect(stringifyAndParseIR(operations['Hero'])).to.containSubset({
      operationName: 'Hero',
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

    expect(stringifyAndParseIR(operations['Hero'])).to.containSubset({
      operationName: 'Hero',
      fragmentsReferenced: ['HeroDetails', 'MoreHeroDetails'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: ['HeroDetails'],
          fields: [
            {
              name: 'id',
              type: 'ID!'
            }
          ],
        }
      ]
    });

    expect(stringifyAndParseIR(fragments['HeroDetails'])).to.containSubset({
      fragmentName: 'HeroDetails',
      fields: [
        {
          name: 'id',
          type: 'ID!'
        },
        {
          name: 'name',
          type: 'String!'
        }
      ]
    });

    expect(stringifyAndParseIR(fragments['MoreHeroDetails'])).to.containSubset({
      fragmentName: 'MoreHeroDetails',
      fields: [
        { name: 'appearsIn',
          type: '[Episode]!'
        },
        {
          name: 'id',
          type: 'ID!'
        }
      ]
    });
  });

  it(`should include fragment spreads at each nested level`, () => {
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

    expect(stringifyAndParseIR(operations['HeroAndFriends'])).to.containSubset({
      operationName: 'HeroAndFriends',
      variables: [],
      fragmentsReferenced: ['HeroDetails'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: ['HeroDetails'],
          fields: [
            {
              name: 'id',
              type: 'ID!'
            },
            { name: 'appearsIn',
              type: '[Episode]!'
            },
            {
              name: 'friends',
              type: '[Character]',
              fragmentSpreads: ['HeroDetails'],
              fields: [
                {
                  name: 'id',
                  type: 'ID!'
                }
              ],
            }
          ],
        }
      ]
    });

    expect(stringifyAndParseIR(fragments['HeroDetails'])).to.containSubset({
      fragmentName: 'HeroDetails',
      fields: [
        {
          name: 'name',
          type: 'String!'
        },
        {
          name: 'id',
          type: 'ID!'
        }
      ]
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

    expect(stringifyAndParseIR(operations['Hero'])).to.containSubset({
      operationName: 'Hero',
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

    expect(stringifyAndParseIR(operations['Hero'])).to.containSubset({
      operationName: 'Hero',
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

    expect(stringifyAndParseIR(fragments['DroidDetails'])).to.containSubset({
      fragmentName: 'DroidDetails',
      typeCondition: 'Droid',
      fields: [
        {
          name: 'primaryFunction',
          type: 'String'
        }
      ]
    });

    expect(stringifyAndParseIR(fragments['HumanDetails'])).to.containSubset({
      fragmentName: 'HumanDetails',
      typeCondition: 'Human',
      fields: [
        {
          name: 'height',
          type: 'Float'
        }
      ]
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

    expect(stringifyAndParseIR(operations['Hero'])).to.containSubset({
      operationName: 'Hero',
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

    expect(stringifyAndParseIR(operations['Hero'])).to.containSubset({
      operationName: 'Hero',
      fragmentsReferenced: ['HeroDetails'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: ['HeroDetails'],
          fields: [],
        }
      ]
    });

    expect(stringifyAndParseIR(fragments['HeroDetails'])).to.containSubset({
      fragmentName: 'HeroDetails',
      fields: [
        {
          name: 'name',
          type: 'String!'
        }
      ],
      inlineFragments: [
        {
          typeCondition: 'Droid',
          fragmentSpreads: [],
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
        },
        {
          typeCondition: 'Human',
          fragmentSpreads: [],
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

    expect(stringifyAndParseIR(operations['HeroName'])).to.containSubset({
      operationName: 'HeroName',
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fields: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  name: 'name',
                  type: 'String!'
                }
              ],
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

    expect(stringifyAndParseIR(operations['HeroName'])).to.containSubset({
      operationName: 'HeroName',
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fields: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fields: [
                {
                  name: 'name',
                  type: 'String!'
                }
              ],
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

    expect(stringifyAndParseIR(operations['HeroName'])).to.containSubset({
      operationName: 'HeroName',
      fragmentsReferenced: ['HeroName'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
          fields: [],
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

    expect(stringifyAndParseIR(operations['HeroName'])).to.containSubset({
      operationName: 'HeroName',
      fragmentsReferenced: ['DroidName'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
          fields: [],
          inlineFragments: [
            {
              typeCondition: 'Droid',
              fragmentSpreads: ['DroidName'],
              fields: []
            }
          ]
        }
      ]
    });
  });

  it(`should include type conditions for inline fragments on a union type`, () => {
    const document = parse(`
      query Search {
        search(text: "an") {
          ... on Droid {
            name
            primaryFunction
          }
          ... on Human {
            name
            height
          }
        }
      }
    `);

    const { operations } = compileToIR(schema, document);

    expect(stringifyAndParseIR(operations['Search'])).to.containSubset({
      operationName: 'Search',
      fields: [
        {
          name: 'search',
          type: '[SearchResult]',
          fields: [],
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
            }
          ]
        }
      ]
    });
  });

  it(`should keep track of fragments referenced at a nested level`, () => {
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

  it(`should keep track of fragments with a type condition referenced at a nested level`, () => {
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
});

function stringifyAndParseIR(ir) {
  return JSON.parse(stringifyIR(ir));
}
