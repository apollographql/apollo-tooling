import chai, { assert } from 'chai'
import chaiSubset from 'chai-subset'
chai.use(chaiSubset);

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
  it(`should merge fields from fragment spreads`, () => {
    const document = parse(`
      query Hero {
        hero {
          id
          ...HeroName
        }
      }

      fragment HeroName on Character {
        id
        ...HeroAppearsIn
        name
      }

      fragment HeroAppearsIn on Character {
        id
        appearsIn
      }
    `);

    const context = new CodeGenerationContext(schema, document);
    const query = context.queries[0];

    assert.containSubset(stringifyTypes(query), {
      name: 'Hero',
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentNames: ['HeroName', 'HeroAppearsIn'],
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
  });

  it(`should merge fields from fragment spreads at nested levels`, () => {
    const document = parse(`
      query HeroAndFriends {
        hero {
          ...HeroDetails
          friends {
            ...HeroDetails
          }
        }
      }

      fragment HeroDetails on Character {
      	name
      }
    `);
    const context = new CodeGenerationContext(schema, document);

    const query = context.queries[0];

    assert.containSubset(stringifyTypes(query), {
      name: 'HeroAndFriends',
      fields: [
        {
          name: 'hero',
          type: 'Character',
          fragmentNames: ['HeroDetails'],
          subfields: [
            {
              name: 'name',
              type: 'String!'
            },
            {
              name: 'friends',
              type: '[Character]',
              fragmentNames: ['HeroDetails'],
              subfields: [
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
  });

  it(`should merge fields from inline fragments`, () => {
    const document = parse(`
      query Hero {
        hero {
          id
          ... on Character {
            ... on Character {
              appearsIn
            }
            name
          }
        }
      }
    `);

    const context = new CodeGenerationContext(schema, document);
    const query = context.queries[0];

    assert.containSubset(stringifyTypes(query), {
      name: 'Hero',
      fields: [
        {
          name: 'hero',
          type: 'Character',
          subfields: [
            {
              name: 'id',
              type: 'ID!'
            },
            {
              name: 'appearsIn',
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

function stringifyTypes(ast) {
  return JSON.parse(JSON.stringify(ast, function(key, value) {
    if (isType(value)) {
      return String(value);
    } else {
      return value;
    }
  }));
}
