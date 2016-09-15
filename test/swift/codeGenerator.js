import { assert } from 'chai'

import { readFileSync } from 'fs'
import path from 'path'

import {
  loadSchema,
  loadAndMergeQueryDocuments,
  validateQueryDocument
} from '../../src/generate'

import { generateSource } from '../../src/swift/codeGenerator'

const schema = loadSchema(require.resolve('../starwars/schema.json'));

describe('#generateSource()', () => {
  it(`should generate code for HeroAndFriendsNames.graphql`, () => {
    const inputPaths = [path.join(__dirname, '../starwars/HeroAndFriendsNames.graphql')];
    const document = loadAndMergeQueryDocuments(inputPaths);
    validateQueryDocument(schema, document);

    const output = generateSource(schema, document);

    const expectedOutput = readFileSync(path.join(__dirname, `./expectedOutput/HeroAndFriendsNamesAPI.swift`), 'utf8');
    assert.equal(output, expectedOutput);
  });
});
