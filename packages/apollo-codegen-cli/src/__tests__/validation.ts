import * as path from 'path';

import { loadSchema, loadAndMergeQueryDocuments } from 'apollo-codegen-core/lib/loading';

import { validateQueryDocument } from '../validation';

const schema = loadSchema(require.resolve('../../../common-test/fixtures/starwars/schema.json'));

describe('Validation', () => {
  function loadQueryDocument(filename: string) {
    return loadAndMergeQueryDocuments([
      path.join(__dirname, '../../../common-test/fixtures/starwars', filename),
    ]);
  }

  test(`should throw an error for AnonymousQuery.graphql`, () => {
    const document = loadQueryDocument('AnonymousQuery.graphql');

    expect(
      () => validateQueryDocument(schema, document)
    ).toThrow(
      'Validation of GraphQL query document failed'
    );
  });

  test(`should throw an error for TypenameAlias.graphql`, () => {
    const document = loadQueryDocument('TypenameAlias.graphql');

    expect(
      () => validateQueryDocument(schema, document)
    ).toThrow(
      'Validation of GraphQL query document failed'
    );
  });

  test(`shouldn't throw an error for an unknown directive`, () => {
    const document = loadQueryDocument('UnknownDirective.graphql');

    validateQueryDocument(schema, document);
  })
});
