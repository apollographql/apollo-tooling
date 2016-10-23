import { expect } from 'chai';

import { stripIndent } from 'common-tags';

import {
  parse,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import {
  generateSource
} from '../../src/typescript/codeGeneration';

import { loadSchema } from '../../src/loading';
const schema = loadSchema(require.resolve('../starwars/schema.json'));

import CodeGenerator from '../../src/utilities/CodeGenerator';

import { compileToIR, printIR } from '../../src/compilation';

describe('TypeScript code generation', function() {
  beforeEach(function() {
    const context = {
      schema: schema,
      operations: {},
      fragments: {},
      typesUsed: {}
    }

    this.generator = new CodeGenerator(context);

    this.compileFromSource = (source) => {
      const document = parse(source);
      const context = compileToIR(schema, document);
      this.generator.context = context;
      return context;
    };

    this.addFragment = (fragment) => {
      this.generator.context.fragments[fragment.fragmentName] = fragment;
    };
  });

  describe('#generateSource()', function() {
    it(`should generate simple query operations including input variables`, function() {
      const context = this.compileFromSource(`
        query HeroName($episode: Episode) {
          hero(episode: $episode) {
            name
          }
        }
      `);

      const source = generateSource(context);

      expect(source).to.include(stripIndent`
        //  This file was automatically generated and should not be edited.

        // The episodes in the Star Wars trilogy
        export type Episode =
          "NEWHOPE", // Star Wars Episode IV: A New Hope, released in 1977.
          "EMPIRE", // Star Wars Episode V: The Empire Strikes Back, released in 1980.
          "JEDI"; // Star Wars Episode VI: Return of the Jedi, released in 1983.


        export interface HeroNameQueryVariables {
          episode: Episode | null;
        }

        export interface HeroNameQuery {
          hero: {
            name: string,
          };
        }
      `);
    });
  });
});
