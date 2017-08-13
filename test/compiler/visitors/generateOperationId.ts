import { parse } from 'graphql';
import { loadSchema } from '../../../src/loading';
import { CompilerOptions, compileToIR } from '../../../src/compiler';
import { generateOperationId } from '../../../src/compiler/visitors/generateOperationId';
import { stripIndent } from 'common-tags';

const schema = loadSchema(require.resolve('../../starwars/schema.json'));

function compileFromSource(source: string, options: CompilerOptions = {}) {
  const document = parse(source);
  return compileToIR(schema, document, options);
}

describe(`computeOperationId()`, () => {
  test(`should generate different operation IDs for different operations`, () => {
    const context1 = compileFromSource(`
      query Hero {
        hero {
          ...HeroDetails
        }
      }
      fragment HeroDetails on Character {
        name
      }
    `);

    const { operationId: id1 } = generateOperationId(context1, context1.operations['Hero']);

    const context2 = compileFromSource(`
      query Hero {
        hero {
          ...HeroDetails
        }
      }
      fragment HeroDetails on Character {
        appearsIn
      }
    `);

    const { operationId: id2 } = generateOperationId(context2, context2.operations['Hero']);

    expect(id1).not.toBe(id2);
  });

  test(`should generate the same operation ID regardless of operation formatting/commenting`, () => {
    const context1 = compileFromSource(`
      query HeroName($episode: Episode) {
        hero(episode: $episode) {
          name
        }
      }
    `);

    const { operationId: id1 } = generateOperationId(context1, context1.operations['HeroName']);

    const context2 = compileFromSource(`
      # Profound comment
      query HeroName($episode:Episode) { hero(episode: $episode) { name } }
      # Deeply meaningful comment
    `);

    const { operationId: id2 } = generateOperationId(context2, context2.operations['HeroName']);

    expect(id1).toBe(id2);
  });

  test(`should generate the same operation ID regardless of fragment order`, () => {
    const context1 = compileFromSource(`
      query Hero {
        hero {
          ...HeroName
          ...HeroAppearsIn
        }
      }
      fragment HeroName on Character {
        name
      }
      fragment HeroAppearsIn on Character {
        appearsIn
      }
    `);

    const { operationId: id1 } = generateOperationId(context1, context1.operations['Hero']);

    const context2 = compileFromSource(`
      query Hero {
        hero {
          ...HeroName
          ...HeroAppearsIn
        }
      }
      fragment HeroAppearsIn on Character {
        appearsIn
      }
      fragment HeroName on Character {
        name
      }
    `);

    const { operationId: id2 } = generateOperationId(context2, context2.operations['Hero']);

    expect(id1).toBe(id2);
  });

  test(`should generate appropriate operation ID mapping source when there are nested fragment references`, () => {
    const context = compileFromSource(`
      query Hero {
        hero {
          ...HeroDetails
        }
      }
      fragment HeroName on Character {
        name
      }
      fragment HeroDetails on Character {
        ...HeroName
        appearsIn
      }
    `);

    const { sourceWithFragments } = generateOperationId(context, context.operations['Hero']);

    expect(sourceWithFragments).toBe(stripIndent`
      query Hero {
        hero {
          ...HeroDetails
        }
      }
      fragment HeroDetails on Character {
        ...HeroName
        appearsIn
      }
      fragment HeroName on Character {
        name
      }
    `);
  });
});
