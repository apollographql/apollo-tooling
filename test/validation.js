import { assert } from 'chai'

import { readFileSync } from 'fs'
import path from 'path'

import {
  loadSchema,
  loadAndMergeQueryDocuments,
} from '../src/loading'

import { validateQueryDocument } from '../src/validation'

const schema = loadSchema(require.resolve('./starwars/schema.json'));

describe('Validation', () => {
  it(`should throw an error for AnonymousQuery.graphql`, () => {
    const inputPaths = [path.join(__dirname, './starwars/AnonymousQuery.graphql')];
    const document = loadAndMergeQueryDocuments(inputPaths);

    assert.throws(
      () => validateQueryDocument(schema, document),
      'Validation of GraphQL query document failed'
    );
  });

  it(`should throw an error for ExplicitTypename.graphql`, () => {
    const inputPaths = [path.join(__dirname, './starwars/ExplicitTypename.graphql')];
    const document = loadAndMergeQueryDocuments(inputPaths);

    assert.throws(
      () => validateQueryDocument(schema, document),
      'Validation of GraphQL query document failed'
    );
  });

  it(`should throw an error for TypenameAlias.graphql`, () => {
    const inputPaths = [path.join(__dirname, './starwars/TypenameAlias.graphql')];
    const document = loadAndMergeQueryDocuments(inputPaths);

    assert.throws(
      () => validateQueryDocument(schema, document),
      'Validation of GraphQL query document failed'
    );
  });
});
