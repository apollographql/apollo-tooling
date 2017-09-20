import { parse, GraphQLSchema } from 'graphql';
import { compileToIR, CompilerOptions, } from '../../src/compiler';
import { loadSchema } from '../../src/loading';

export const starWarsSchema = loadSchema(require.resolve('../fixtures/starwars/schema.json'));

export function compile(source: string, schema: GraphQLSchema = starWarsSchema, options: CompilerOptions = {}) {
  const document = parse(source);
  return compileToIR(schema, document, options);
}
