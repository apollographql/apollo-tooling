import { assert } from 'chai'

import { readFileSync } from 'fs'
import path from 'path'

import {
  loadSchema,
  loadAndMergeQueryDocuments,
} from '../../src/generate'

import { CompilationContext } from '../../src/compilation'

import { generateSource } from '../../src/swift'

const schema = loadSchema(require.resolve('../starwars/schema.json'));

/*
describe('#generateSource()', () => {
  ['HeroAndFriendsNames', 'HeroAndFriends'].forEach(name => {
    it(`should generate code for ${name}.graphql`, () => {
      const inputPaths = [path.join(__dirname, '../starwars', `${name}.graphql`)];
      const document = loadAndMergeQueryDocuments(inputPaths);

      const context = new CompilationContext(schema, document);
      const output = generateSource(context);

      const expectedOutput = readFileSync(path.join(__dirname, `./expectedOutput/${name}.swift`), 'utf8');
      assert.equal(output, expectedOutput);
    });
  });
});
*/
