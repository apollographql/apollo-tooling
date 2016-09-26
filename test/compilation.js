import { assert } from 'chai'

import { stripIndent } from 'common-tags'

import {
  parse,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import { loadSchema } from '../src/generate'
import { CompilationContext, printFields } from '../src/compilation'

const schema = loadSchema(require.resolve('./starwars/schema.json'));

describe('compilation', () => {
  it(`should include defined variables`, () => {
    const document = parse(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }
    `);

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(querySpec), {
      operationName: 'HeroName',
      variables: [
        { name: "episode", type: 'Episode' }
      ],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
          fields: [
            {
              name: 'name',
              type: 'String!'
            }
          ],
          inlineFragments: [],
        }
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

    const context = new CompilationContext(schema, document);
    context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(context.typesUsed), ['Episode']);
  });

  it(`should merge fields from inline fragments recursively`, () => {
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

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(querySpec), {
      operationName: 'Hero',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
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

  it(`should merge fields from fragment spreads recursively`, () => {
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

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(querySpec), {
      operationName: 'Hero',
      variables: [],
      fragmentsReferenced: ['HeroDetails', 'MoreHeroDetails'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: ['HeroDetails', 'MoreHeroDetails'],
          fields: [
            {
              name: 'id',
              type: 'ID!'
            },
            { name: 'appearsIn',
              type: '[Episode]!'
            },
            {
              name: 'name',
              type: 'String!'
            }
          ],
          inlineFragments: []
        }
      ]
    });

    const heroDetailsSpec = context.compileFragment(context.fragmentNamed('HeroDetails'));

    assert.deepEqual(stringifyReferences(heroDetailsSpec), {
      fragmentName: 'HeroDetails',
      fields: [
        {
          name: 'id',
          type: 'ID!'
        },
        { name: 'appearsIn',
          type: '[Episode]!'
        },
        {
          name: 'name',
          type: 'String!'
        }
      ]
    });

    const moreHeroDetailsSpec = context.compileFragment(context.fragmentNamed('MoreHeroDetails'));

    assert.deepEqual(stringifyReferences(moreHeroDetailsSpec), {
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

  it(`should merge fields from fragment spreads at each nested level`, () => {
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

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(querySpec), {
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
              name: 'name',
              type: 'String!'
            },
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
                },
                {
                  name: 'name',
                  type: 'String!'
                }
              ],
              inlineFragments: []
            }
          ],
          inlineFragments: []
        }
      ]
    });

    const heroDetailsSpec = context.compileFragment(context.fragmentNamed('HeroDetails'));

    assert.deepEqual(stringifyReferences(heroDetailsSpec), {
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

  it(`should merge fields for inline fragments with type conditions`, () => {
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

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(querySpec), {
      operationName: 'Hero',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
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

  it(`should merge fields for fragments with type conditions`, () => {
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

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(querySpec), {
      operationName: 'Hero',
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

    const droidDetailsSpec = context.compileFragment(context.fragmentNamed('DroidDetails'));

    assert.deepEqual(stringifyReferences(droidDetailsSpec), {
      fragmentName: 'DroidDetails',
      fields: [
        {
          name: 'primaryFunction',
          type: 'String'
        }
      ]
    });

    const humanDetailsSpec = context.compileFragment(context.fragmentNamed('HumanDetails'));

    assert.deepEqual(stringifyReferences(humanDetailsSpec), {
      fragmentName: 'HumanDetails',
      fields: [
        {
          name: 'height',
          type: 'Float'
        }
      ]
    });
  });

  it(`should merge fields for inline fragments on a union type`, () => {
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

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.deepEqual(stringifyReferences(querySpec), {
      operationName: 'Search',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'search',
          type: '[SearchResult]',
          fragmentSpreads: [],
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

  it(`should include the source of operations with __typename added`, () => {
    const source = stripIndent`
      query HeroName {
        hero {
          name
        }
      }
    `
    const document = parse(source);

    const context = new CompilationContext(schema, document);
    const querySpec = context.compileOperation(context.operations[0]);

    assert.equal(querySpec.source, stripIndent`
      query HeroName {
        hero {
          __typename
          name
        }
      }
    `);
  });

  it(`should include the source of fragments with __typename added`, () => {
    const source = stripIndent`
      fragment HeroDetails on Character {
        name
      }
    `
    const document = parse(source);

    const context = new CompilationContext(schema, document);
    const fragmentSpec = context.compileFragment(context.fragments[0]);

    assert.equal(fragmentSpec.source, stripIndent`
      fragment HeroDetails on Character {
        __typename
        name
      }
    `);
  });
});

function stringifyReferences(ast) {
  return JSON.parse(JSON.stringify(ast, function(key, value) {
    if (key === "source") {
      return undefined;
    }

    if (isType(value)) {
      return String(value);
    }

    return value;
  }));
}
