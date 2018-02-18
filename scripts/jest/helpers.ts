import { parse, GraphQLSchema } from 'graphql';
import { compileToIR, CompilerOptions, } from 'apollo-codegen-compiler';
import { loadSchema } from 'apollo-codegen-utilities';

export const starWarsSchema = loadSchema(require.resolve('apollo-codegen-test-fixtures/starwars/schema.json'));

export function compile(source: string, schema: GraphQLSchema = starWarsSchema, options: CompilerOptions = {}) {
  const document = parse(source);
  return compileToIR(schema, document, options);
}
