import { expect } from 'chai';

import { stripIndent } from 'common-tags';

import {
  GraphQLID,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import { loadSchema } from '../../src/loading'

import CodeGenerator from '../../src/CodeGenerator';

import {
  classDeclarationForFragment,
  protocolDeclarationForFragment
} from '../../src/swift/fragments';

import { propertyFromField } from '../../src/swift/properties'

const schema = loadSchema(require.resolve('../starwars/schema.json'));

describe('Swift code generation - Fragments', function() {
  beforeEach(function() {
    this.generator = new CodeGenerator();
  });

  describe('#classDeclarationForFragment()', function() {
    it(`should generate a class declaration for a fragment`, function() {
      classDeclarationForFragment(this.generator, {
        fragmentName: 'HeroDetails',
        fields: [
          {
            name: 'name',
            type: GraphQLString
          },
          {
            name: 'appearsIn',
            type: new GraphQLList(schema.getType('Episode'))
          }
        ],
        source: 'fragment HeroDetails on Character {\n  name\n  appearsIn\n}'
      });

      expect(this.generator.output).to.equal(stripIndent`
        public final class HeroDetailsFragment: GraphQLFragment {
          public static let fragmentDefinition =
            "fragment HeroDetails on Character {" +
            "  name" +
            "  appearsIn" +
            "}"

          public typealias Data = HeroDetails
        }
      `);
    });
  });

  describe('#protocolDeclarationForFragment()', function() {
    it(`should generate a protocol declaration for a fragment`, function() {
      protocolDeclarationForFragment(this.generator, {
        fragmentName: 'HeroDetails',
        fields: [
          {
            name: 'name',
            type: GraphQLString
          },
          {
            name: 'appearsIn',
            type: new GraphQLList(schema.getType('Episode'))
          }
        ],
        source: 'fragment HeroDetails on Character {\n  name\n  appearsIn\n}'
      });

      expect(this.generator.output).to.equal(stripIndent`
        public protocol HeroDetails {
          var name: String? { get }
          var appearsIn: [Episode?]? { get }
        }
      `);
    });

    it(`should generate a protocol declaration for a fragment with a subselection`, function() {
      protocolDeclarationForFragment(this.generator, {
        fragmentName: 'HeroDetails',
        fields: [
          {
            name: 'name',
            type: GraphQLString
          },
          {
            name: 'friends',
            type: new GraphQLList(schema.getType('Character')),
            fragmentSpreads: ['FriendDetails'],
            fields: [
              {
                name: 'name',
                type: GraphQLString
              }
            ]
          }
        ],
        source: 'fragment HeroDetails on Character {\n  name\n  appearsIn\n}'
      });

      expect(this.generator.output).to.equal(stripIndent`
        public protocol HeroDetails {
          var name: String? { get }
          var friends: [HeroDetails_Friend?]? { get }
        }

        public protocol HeroDetails_Friend: FriendDetails {
          var name: String? { get }
        }
      `);
    });
  });
});
