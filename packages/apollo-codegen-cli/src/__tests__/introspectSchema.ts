import { readFileSync } from 'fs';
import { join } from 'path';

import { introspect } from '../introspectSchema';

describe('Introspecting GraphQL schema documents', () => {
  test(`should generate valid introspection JSON file`, async () => {
    const schemaContents = readFileSync(join(__dirname, '../../../common-test/fixtures/starwars/schema.graphql')).toString();
    const expected = readFileSync(join(__dirname, '../../../common-test/fixtures/starwars/schema.json')).toString();

    const schema = await introspect(schemaContents);

    expect(JSON.stringify(schema, null, 2)).toEqual(expected);
  });
});
