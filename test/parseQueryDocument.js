import { readFileSync } from 'fs'
import path from 'path'
import { assert } from 'chai'

import { buildClientSchema } from 'graphql';

import parseQueryDocument from '../src/parseQueryDocument'

const schemaData = require('./starwars/schema.json');
const schema = buildClientSchema(schemaData);

describe('#parseQueryDocument()', () => {
  it('should parse a simple query document', () => {
    const queryDocument = readFileSync(path.join(__dirname, './starwars/HeroName.graphql'));

    const definitions = parseQueryDocument(queryDocument, schema);

    const queryDefinition = definitions[0];
    assert.equal(queryDefinition.name, "HeroName")
  });
});
