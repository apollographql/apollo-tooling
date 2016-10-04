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
  classDeclarationForOperation,
  initializerDeclarationForVariables,
  variablesProperty,
  structDeclarationForProperty
} from '../../src/swift/operations';

import { propertyFromField } from '../../src/swift/properties'

const schema = loadSchema(require.resolve('../starwars/schema.json'));

describe('operations', function() {
  beforeEach(function() {
    this.generator = new CodeGenerator();
  });

  describe('#initializerDeclarationForVariables()', function() {
    it(`should print initializer for a variable`, function() {
      initializerDeclarationForVariables(this.generator, [
        { name: 'episode', type: new GraphQLNonNull(schema.getType('Episode')) }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public init(episode: Episode) {
          self.episode = episode
        }
      `);
    });

    it(`should print initializer for an optional variable`, function() {
      initializerDeclarationForVariables(this.generator, [
        { name: 'episode', type: schema.getType('Episode') }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public init(episode: Episode? = nil) {
          self.episode = episode
        }
      `);
    });

    it(`should print initializer for multiple variables`, function() {
      initializerDeclarationForVariables(this.generator, [
        { name: 'episode', type: schema.getType('Episode') },
        { name: 'scene', type: GraphQLString }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public init(episode: Episode? = nil, scene: String? = nil) {
          self.episode = episode
          self.scene = scene
        }
      `);
    });
  });

  describe('#variablesProperty()', function() {
    it(`should print variables property for a variable`, function() {
      variablesProperty(this.generator, [
        { name: 'episode', type: new GraphQLNonNull(schema.getType('Episode')) }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public var variables: GraphQLMap? {
          return ["episode": episode]
        }
      `);
    });

    it(`should print variables property for multiple variables`, function() {
      variablesProperty(this.generator, [
        { name: 'episode', type: schema.getType('Episode') },
        { name: 'scene', type: GraphQLString }
      ]);

      expect(this.generator.output).to.equal(stripIndent`
        public var variables: GraphQLMap? {
          return ["episode": episode, "scene": scene]
        }
      `);
    });
  });

  describe('#classDeclarationForOperation()', function() {
    it(`should print a class declaration for a query`, function() {
      classDeclarationForOperation(this.generator, {
        operationName: 'HeroName',
        variables: [
          { name: 'episode', type: schema.getType('Episode') }
        ],
        fields: [
          { name: 'name', type: GraphQLString }
        ],
        source: 'query($episode: Episode) {\n  hero(episode: $episode) {\n    name\n  }\n}'
      });

      expect(this.generator.output).to.equal(stripIndent`
        public final class HeroNameQuery: GraphQLQuery {
          public static let operationDefinition =
            "query($episode: Episode) {" +
            "  hero(episode: $episode) {" +
            "    name" +
            "  }" +
            "}"

          public let episode: Episode?

          public init(episode: Episode? = nil) {
            self.episode = episode
          }

          public var variables: GraphQLMap? {
            return ["episode": episode]
          }

          public struct Data: GraphQLMapConvertible {
            public let name: String?

            public init(map: GraphQLMap) throws {
              name = try map.optionalValue(forKey: "name")
            }
          }
        }
      `);
    });
  });

  describe('#structDeclarationForProperty()', function() {
    it(`should print a struct declaration`, function() {
      structDeclarationForProperty(this.generator, propertyFromField({
        name: 'Hero',
        type: schema.getType('Character'),
        fields: [
          { name: 'name', type: GraphQLString }
        ]
      }));

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMapConvertible {
          public let name: String?

          public init(map: GraphQLMap) throws {
            name = try map.optionalValue(forKey: "name")
          }
        }
      `);
    });

    it(`should print a nested struct declaration`, function() {
      structDeclarationForProperty(this.generator, propertyFromField({
        name: 'Hero',
        type: schema.getType('Character'),
        fields: [
          {
            name: 'friends',
            type: new GraphQLList(schema.getType('Character')),
            fields: [
              { name: 'name', type: GraphQLString }
            ]
          }
        ]
      }));

      expect(this.generator.output).to.equal(stripIndent`
        public struct Hero: GraphQLMapConvertible {
          public let friends: [Friend?]?

          public init(map: GraphQLMap) throws {
            friends = try map.optionalList(forKey: "friends")
          }

          public struct Friend: GraphQLMapConvertible {
            public let name: String?

            public init(map: GraphQLMap) throws {
              name = try map.optionalValue(forKey: "name")
            }
          }
        }
      `);
    });
  });
});
