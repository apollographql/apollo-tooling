import { parse, buildSchema } from 'graphql';

import { compileToIR, CompilerOptions, SelectionSet, Field } from '../../src/compiler';

import { TypeCase, Record } from '../../src/compiler/flattenIR';

import { loadSchema } from '../../src/loading';
import { mergeInFragmentSpreads } from "../../src/compiler/visitors/mergeInFragmentSpreads";
const schema = loadSchema(require.resolve('../starwars/schema.json'));

const animalSchema = buildSchema(`
  type Query {
    animal: Animal
    catOrBird: CatOrBird
  }

  union Animal = Cat | Bird | Crocodile | Fish
  union CatOrBird = Cat | Bird

  interface Pet {
    name: String!
  }

  interface WarmBlooded {
    bodyTemperature: Int!
  }

  type Cat implements Pet, WarmBlooded {
    name: String!
    bodyTemperature: Int!
  }

  type Bird implements Pet, WarmBlooded {
    name: String!
    bodyTemperature: Int!
  }

  type Fish implements Pet {
    name: String!
  }

  type Crocodile {
    age: Int!
  }
`);

function compileFromSource(source: string, options: CompilerOptions = {}) {
  const document = parse(source);
  return compileToIR(schema, document, options);
}

function responseKeysForRecord(record: Record): string[] {
  return Array.from(record.fieldMap.keys());
}

declare global {
  namespace jest {
    interface Matchers<R> {
      toContainRecordMatching(possibleTypeNames: string[], expectedResponseKeys: string[]): R;
    }
    interface MatcherUtils {
      equals(a: any, b: any): boolean;
    }
  }
}

function toContainRecordMatching(
  this: jest.MatcherUtils,
  received: TypeCase,
  possibleTypeNames: string[],
  expectedResponseKeys: string[]
): { message(): string; pass: boolean } {
  const record = received.records.find(record => {
    return this.equals(Array.from(record.possibleTypes).map(type => type.name), possibleTypeNames);
  });

  if (!record) {
    return {
      message: () =>
        `Expected type case to contain record for:\n` +
        `  ${this.utils.printExpected(possibleTypeNames)}\n` +
        `But only found records for:\n` +
        `  ${this.utils.printReceived(
          received.records.map(record => {
            return Array.from(record.possibleTypes).map(type => type.name);
          })
        )}`,
      pass: false
    };
  }

  const actualResponseKeys = responseKeysForRecord(record);

  const pass = this.equals(actualResponseKeys, expectedResponseKeys);

  if (pass) {
    return {
      message: () =>
        `Expected record for ${this.utils.printExpected(possibleTypeNames)}\n` +
        `To not match:\n` +
        `   ${this.utils.printExpected(expectedResponseKeys)}` +
        'Received:\n' +
        `  ${this.utils.printReceived(actualResponseKeys)}`,
      pass: true
    };
  } else {
    return {
      message: () =>
        `Expected record for ${this.utils.printExpected(possibleTypeNames)}\n` +
        `To match:\n` +
        `   ${this.utils.printExpected(expectedResponseKeys)}\n` +
        'Received:\n' +
        `   ${this.utils.printReceived(actualResponseKeys)}`,
      pass: false
    };
  }
}

expect.extend(
  {
    toContainRecordMatching
  } as any
);

describe('TypeCase', () => {
  it('should recursively include inline fragments with type conditions that match the parent type', () => {
    const context = compileFromSource(`
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

    const selectionSet = (context.operations['Hero'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(1);
    expect(typeCase).toContainRecordMatching(['Human', 'Droid'], ['id', 'name', 'appearsIn']);
  });

  it('should recursively include fragment spreads with type conditions that match the parent type', () => {
    const context = compileFromSource(`
      query Hero {
        hero {
          id
          ...HeroDetails
        }
      }

      fragment HeroDetails on Character {
        name
        ...MoreHeroDetails
        id
      }

      fragment MoreHeroDetails on Character {
        appearsIn
      }
    `);

    const selectionSet = (context.operations['Hero'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(mergeInFragmentSpreads(context, selectionSet));

    expect(typeCase.records).toHaveLength(1);
    expect(typeCase).toContainRecordMatching(['Human', 'Droid'], ['id', 'name', 'appearsIn']);
  });

  it('should ignore type modifiers when matching the parent type', () => {
    const schema = buildSchema(`
      type Query {
        heroes: [Character]
      }

      interface Character {
        name: String!
      }

      type Human implements Character {
        name: String!
      }

      type Droid implements Character {
        name: String!
      }
    `);

    const context = compileToIR(
      schema,
      parse(`
      query Hero {
        heroes {
          ... on Character {
            name
          }
        }
      }
    `)
    );

    const selectionSet = (context.operations['Hero'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(1);
    expect(typeCase).toContainRecordMatching(['Human', 'Droid'], ['name']);
  });

  it('should merge fields from the default case into type conditions', () => {
    const context = compileFromSource(`
      query Hero {
        hero {
          name
          ... on Droid {
            primaryFunction
          }
          appearsIn
          ... on Human {
            height
          }
        }
      }
    `);

    const selectionSet = (context.operations['Hero'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(2);
    expect(typeCase).toContainRecordMatching(['Droid'], ['name', 'primaryFunction', 'appearsIn']);
    expect(typeCase).toContainRecordMatching(['Human'], ['name', 'appearsIn', 'height']);
  });

  it(`should merge fields from type conditions with the same type`, () => {
    const context = compileFromSource(`
      query Hero {
        hero {
          name
          ... on Droid {
            primaryFunction
          }
          ... on Droid {
            appearsIn
          }
        }
      }
    `);

    const selectionSet = (context.operations['Hero'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(2);
    expect(typeCase).toContainRecordMatching(['Droid'], ['name', 'primaryFunction', 'appearsIn']);
    expect(typeCase).toContainRecordMatching(['Human'], ['name']);
  });

  it('should inherit type condition when nesting an inline fragment in an inline fragment with a more specific type condition', () => {
    const context = compileFromSource(`
      query Hero {
        hero {
          ... on Droid {
            ... on Character {
              name
            }
          }
        }
      }
    `);

    const selectionSet = (context.operations['Hero'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(2);
    expect(typeCase).toContainRecordMatching(['Droid'], ['name']);
    expect(typeCase).toContainRecordMatching(['Human'], []);
  });

  it('should not inherit type condition when nesting an inline fragment in an inline fragment with a less specific type condition', () => {
    const context = compileFromSource(`
      query Hero {
        hero {
          ... on Character {
            ... on Droid {
              name
            }
          }
        }
      }
    `);

    const selectionSet = (context.operations['Hero'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(2);
    expect(typeCase).toContainRecordMatching(['Droid'], ['name']);
    expect(typeCase).toContainRecordMatching(['Human'], []);
  });

  it('should merge fields from the parent case into nested type conditions', () => {
    const context = compileToIR(
      animalSchema,
      parse(`
      query Animal {
        animal {
          ... on Pet {
            name
            ... on WarmBlooded {
              bodyTemperature
            }
          }
        }
      }
    `)
    );

    const selectionSet = (context.operations['Animal'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(3);
    expect(typeCase).toContainRecordMatching(['Cat', 'Bird'], ['name', 'bodyTemperature']);
    expect(typeCase).toContainRecordMatching(['Fish'], ['name']);
    expect(typeCase).toContainRecordMatching(['Crocodile'], []);
  });

  it('should merge fields from the parent case into nested type conditions', () => {
    const context = compileToIR(
      animalSchema,
      parse(`
      query Animal {
        animal {
          ... on Pet {
            name
            ... on WarmBlooded {
              bodyTemperature
            }
          }
          ... on WarmBlooded {
            bodyTemperature
            ... on Pet {
              name
            }
          }
        }
      }
    `)
    );

    const selectionSet = (context.operations['Animal'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(3);
    expect(typeCase).toContainRecordMatching(['Cat', 'Bird'], ['name', 'bodyTemperature']);
    expect(typeCase).toContainRecordMatching(['Fish'], ['name']);
    expect(typeCase).toContainRecordMatching(['Crocodile'], []);
  });

  it('should not keep type conditions when all possible objects match', () => {
    const context = compileToIR(
      animalSchema,
      parse(`
      query Animal {
        catOrBird {
          ... on Pet {
            name
            ... on WarmBlooded {
              bodyTemperature
            }
          }
        }
      }
    `)
    );

    const selectionSet = (context.operations['Animal'].selectionSet.selections[0] as Field)
      .selectionSet as SelectionSet;
    const typeCase = new TypeCase(selectionSet);

    expect(typeCase.records).toHaveLength(1);
    expect(typeCase).toContainRecordMatching(['Cat', 'Bird'], ['name', 'bodyTemperature']);
  });
});
