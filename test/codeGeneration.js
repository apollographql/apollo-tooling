import { assert } from 'chai'

import {
  parse,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import { loadSchema } from '../src/generate'
import { CodeGenerationContext, printFields } from '../src/codeGeneration'

const schema = loadSchema(require.resolve('./starwars/schema.json'));

describe('CodeGenerationContext', () => {
  it(`should include defined variables for queries`, () => {
    const document = parse(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }
    `);

    const context = new CodeGenerationContext(schema, document);

    assert.deepEqual(stringifySchemaReferences(context.queries[0]), {
      operationName: 'HeroName',
      variables: [
        { name: "episode", type: 'Episode' }
      ],
      fragmentsUsed: [],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentsUsed: [],
          subfields: [
            {
              name: 'name',
              type: 'String!'
            }
          ]
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

    const context = new CodeGenerationContext(schema, document);

    assert.deepEqual(stringifySchemaReferences(context.queries[0]), {
      operationName: 'Hero',
      variables: [],
      fragmentsUsed: ['HeroDetails', 'MoreHeroDetails'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentsUsed: ['HeroDetails', 'MoreHeroDetails'],
          subfields: [
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
        }
      ]
    });

    assert.deepEqual(stringifySchemaReferences(context.fragmentNamed('HeroDetails')), {
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

    assert.deepEqual(stringifySchemaReferences(context.fragmentNamed('MoreHeroDetails')), {
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
    
    const context = new CodeGenerationContext(schema, document);

    assert.deepEqual(stringifySchemaReferences(context.queries[0]), {
      operationName: 'HeroAndFriends',
      variables: [],
      fragmentsUsed: ['HeroDetails'],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentsUsed: ['HeroDetails'],
          subfields: [
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
              fragmentsUsed: ['HeroDetails'],
              subfields: [
                {
                  name: 'id',
                  type: 'ID!'
                },
                {
                  name: 'name',
                  type: 'String!'
                }
              ]
            }
          ]
        }
      ]
    });

    assert.deepEqual(stringifySchemaReferences(context.fragmentNamed('HeroDetails')), {
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

    const context = new CodeGenerationContext(schema, document);

    assert.deepEqual(stringifySchemaReferences(context.queries[0]), {
      operationName: 'Hero',
      variables: [],
      fragmentsUsed: [],
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentsUsed: [],
          subfields: [
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
          ]
        }
      ]
    });
  });

  it(`should throw an error when a fragment spread would require a polymorphic result`, () => {
    const document = parse(`
      query Hero {
        hero {
          id
          name
          ...DroidDetails
        }
      }

      fragment DroidDetails on Droid {
        primaryFunction
      }
    `);

    assert.throws(
      () => new CodeGenerationContext(schema, document),
      'Apollo iOS does not yet support polymorphic results through type conditions'
    );
  });

  it(`should throw an error when an inline fragments would require a polymorphic result`, () => {
    const document = parse(`
      query Hero {
        hero {
          id
          name
          ... on Droid {
            primaryFunction
          }
        }
      }
    `);

    assert.throws(
      () => new CodeGenerationContext(schema, document),
      'Apollo iOS does not yet support polymorphic results through type conditions'
    );
  });

  it(`should throw an error when using inline fragments on a union type`, () => {
    const document = parse(`
      query Search {
        search(text: "an") {
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

    assert.throws(
      () => new CodeGenerationContext(schema, document),
      'Apollo iOS does not yet support polymorphic results through type conditions'
    );
  });
});

function stringifySchemaReferences(ast) {
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
