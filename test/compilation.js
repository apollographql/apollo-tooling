import chai, { assert, expect } from 'chai'
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

import { loadSchema } from '../src/generate'
import { CompilationContext, stringifyIR, printIR } from '../src/compilation'

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
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
      operationName: 'HeroName',
      variables: [
        { name: 'episode', type: 'Episode' }
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
          typeConditions: [],
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

    assert.deepEqual(stringifyAndParseIR(context.typesUsed), ['Episode']);
  });

  it(`should compile inline fragments recursively`, () => {
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
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
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
          typeConditions: []
        }
      ]
    });
  });

  it(`should compile fragment spreads recursively`, () => {
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
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
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
          typeConditions: []
        }
      ]
    });

    const heroDetailsIR = context.compileFragment(context.fragmentNamed('HeroDetails'));

    expect(stringifyAndParseIR(heroDetailsIR)).to.containSubset({
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

    const moreHeroDetailsIR = context.compileFragment(context.fragmentNamed('MoreHeroDetails'));

    expect(stringifyAndParseIR(moreHeroDetailsIR)).to.containSubset({
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

  it(`should compile fragment spreads at each nested level`, () => {
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
    const queryIR = context.compileOperation(context.operations[0]);


    expect(stringifyAndParseIR(queryIR)).to.containSubset({
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
              typeConditions: []
            }
          ],
          typeConditions: []
        }
      ]
    });

    const heroDetailsIR = context.compileFragment(context.fragmentNamed('HeroDetails'));

    expect(stringifyAndParseIR(heroDetailsIR)).to.containSubset({
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

  it(`should compile inline fragments with type conditions`, () => {
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
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
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
          typeConditions: [
            {
              type: 'Droid',
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
              type: 'Human',
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
        }
      ]
    });
  });

  it(`should compile fragment spreads with type conditions`, () => {
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
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
      operationName: 'Hero',
      variables: [],
      fragmentsReferenced: ['DroidDetails', 'HumanDetails'],
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
          typeConditions: [
            {
              type: 'Droid',
              fragmentSpreads: ['DroidDetails'],
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
              type: 'Human',
              fragmentSpreads: ['HumanDetails'],
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

    const droidDetailsIR = context.compileFragment(context.fragmentNamed('DroidDetails'));

    expect(stringifyAndParseIR(droidDetailsIR)).to.containSubset({
      fragmentName: 'DroidDetails',
      fields: [
        {
          name: 'primaryFunction',
          type: 'String'
        }
      ]
    });

    const humanDetailsIR = context.compileFragment(context.fragmentNamed('HumanDetails'));

    expect(stringifyAndParseIR(humanDetailsIR)).to.containSubset({
      fragmentName: 'HumanDetails',
      fields: [
        {
          name: 'height',
          type: 'Float'
        }
      ]
    });
  });

  it(`should compile a nested inline fragment with a super type as a type condition`, () => {
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

    const context = new CompilationContext(schema, document);
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
      operationName: 'HeroName',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
          fields: [],
          typeConditions: [
            {
              type: 'Droid',
              fragmentSpreads: [],
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

  it(`should compile a nested inline fragment with a subtype as a type condition`, () => {
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

    const context = new CompilationContext(schema, document);
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
      operationName: 'HeroName',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
          fields: [],
          typeConditions: [
            {
              type: 'Droid',
              fragmentSpreads: [],
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

  it(`should compile a nested fragment spread with a supertype as a type condition`, () => {
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

    const context = new CompilationContext(schema, document);
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
      operationName: 'HeroName',
      variables: [],
      fragmentsReferenced: ['HeroName'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
          fields: [],
          typeConditions: [
            {
              type: 'Droid',
              fragmentSpreads: ['HeroName'],
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

  it(`should compile a nested fragment spread with a subtype as a type condition`, () => {
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

    const context = new CompilationContext(schema, document);
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
      operationName: 'HeroName',
      variables: [],
      fragmentsReferenced: ['DroidName'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentSpreads: [],
          fields: [],
          typeConditions: [
            {
              type: 'Droid',
              fragmentSpreads: ['DroidName'],
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

  it(`should compile inline fragments on a union type`, () => {
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
    const queryIR = context.compileOperation(context.operations[0]);

    expect(stringifyAndParseIR(queryIR)).to.containSubset({
      operationName: 'Search',
      variables: [],
      fragmentsReferenced: [],
      fields: [
        {
          name: 'search',
          type: '[SearchResult]',
          fragmentSpreads: [],
          fields: [],
          typeConditions: [
            {
              type: 'Droid',
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
              type: 'Human',
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

    const context = new CompilationContext(schema, document);
    const queryIR = context.compileOperation(context.operations[0]);

    assert.deepEqual(queryIR.fragmentsReferenced, ['HeroDetails']);
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

    const context = new CompilationContext(schema, document);
    const queryIR = context.compileOperation(context.operations[0]);

    assert.deepEqual(queryIR.fragmentsReferenced, ['HeroDetails']);
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

    const context = new CompilationContext(schema, document);
    const queryIR = context.compileOperation(context.operations[0]);

    assert.equal(queryIR.source, stripIndent`
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

    const context = new CompilationContext(schema, document);
    const fragmentIR = context.compileFragment(context.fragments[0]);

    assert.equal(fragmentIR.source, stripIndent`
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
