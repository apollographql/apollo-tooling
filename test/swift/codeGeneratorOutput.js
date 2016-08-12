import { assert } from 'chai'

import { readFileSync } from 'fs'
import path from 'path'
import glob from 'glob'

import { buildClientSchema } from 'graphql';

import parseQueryDocument from '../../src/parseQueryDocument'
import { generateSourceForQueryDefinition } from '../../src/swift/codeGenerator'

const schemaData = require('../starwars/schema.json');
const schema = buildClientSchema(schemaData);

describe('#generateSourceForQueryDefinition()', () => {
  glob.sync(path.join(__dirname, '../starwars/*.graphql')).forEach(file => {
    it(`should generate code for ${path.basename(file)}`, () => {
      const queryDocument = readFileSync(file, 'utf8');
      const definitions = parseQueryDocument(queryDocument, schema);

      definitions.forEach(definition => {
        const output = generateSourceForQueryDefinition(definition);
        const expectedOutput = readFileSync(path.join(__dirname, `./expectedOutput/${definition.name}Query.swift`), 'utf8');
        assert.equal(output, expectedOutput);
      });
    });
  });
});
