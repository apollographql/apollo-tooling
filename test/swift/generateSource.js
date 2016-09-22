import { assert } from 'chai'

import { readFileSync } from 'fs'
import path from 'path'

import {
  loadSchema,
  loadAndMergeQueryDocuments,
} from '../../src/generate'

import { CodeGenerationContext } from '../../src/codeGeneration'

import { generateSource } from '../../src/swift'

const schema = loadSchema(require.resolve('../starwars/schema.json'));

describe('#generateSource()', () => {
  it(`should generate code for HeroAndFriendsNames.graphql`, () => {
    const inputPaths = [path.join(__dirname, '../starwars/HeroAndFriendsNames.graphql')];
    const document = loadAndMergeQueryDocuments(inputPaths);

    const context = new CodeGenerationContext(schema, document);
    const output = generateSource(context);

    const expectedOutput = readFileSync(path.join(__dirname, `./expectedOutput/HeroAndFriendsNamesAPI.swift`), 'utf8');
    assert.equal(output, expectedOutput);
  });
});
