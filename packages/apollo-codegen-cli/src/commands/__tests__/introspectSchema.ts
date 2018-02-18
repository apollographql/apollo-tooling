import { readFileSync } from 'fs';
import { introspect } from '../introspectSchema';

describe('Introspecting GraphQL schema documents', () => {
  test(`should generate valid introspection JSON file`, async () => {
    const schemaContents = readFileSync(require.resolve('apollo-codegen-test-fixtures/starwars/schema.graphql')).toString();
    const expected = readFileSync(require.resolve('apollo-codegen-test-fixtures/starwars/schema.json')).toString();

    const schema = await introspect(schemaContents);

    expect(JSON.stringify(schema, null, 2)).toEqual(expected);
  });
});
