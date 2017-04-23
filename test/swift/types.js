import { stripIndent } from 'common-tags'

import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
} from 'graphql';

import { loadSchema } from '../../src/loading'
const schema = loadSchema(require.resolve('../starwars/schema.json'));

import CodeGenerator from '../../src/utilities/CodeGenerator';

import { typeNameFromGraphQLType } from '../../src/swift/types'

describe('Swift code generation: Types', function() {
  describe('#typeNameFromGraphQLType()', function() {
    test('should return String? for GraphQLString', function() {
      expect(typeNameFromGraphQLType({}, GraphQLString)).toBe('String?');
    });

    test('should return String for GraphQLNonNull(GraphQLString)', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLNonNull(GraphQLString))).toBe('String');
    });

    test('should return [String?]? for GraphQLList(GraphQLString)', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLList(GraphQLString))).toBe('[String?]?');
    });

    test('should return [String?] for GraphQLNonNull(GraphQLList(GraphQLString))', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLNonNull(new GraphQLList(GraphQLString)))).toBe('[String?]');
    });

    test('should return [String]? for GraphQLList(GraphQLNonNull(GraphQLString))', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLList(new GraphQLNonNull(GraphQLString)))).toBe('[String]?');
    });

    test('should return [String] for GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))))).toBe('[String]');
    });

    test('should return [[String?]?]? for GraphQLList(GraphQLList(GraphQLString))', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLList(new GraphQLList(GraphQLString)))).toBe('[[String?]?]?');
    });

    test('should return [[String?]]? for GraphQLList(GraphQLNonNull(GraphQLList(GraphQLString)))', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLList(new GraphQLNonNull(new GraphQLList(GraphQLString))))).toBe('[[String?]]?');
    });

    test('should return Int? for GraphQLInt', function() {
      expect(typeNameFromGraphQLType({}, GraphQLInt)).toBe('Int?');
    });

    test('should return Double? for GraphQLFloat', function() {
      expect(typeNameFromGraphQLType({}, GraphQLFloat)).toBe('Double?');
    });

    test('should return Bool? for GraphQLBoolean', function() {
      expect(typeNameFromGraphQLType({}, GraphQLBoolean)).toBe('Bool?');
    });

    test('should return GraphQLID? for GraphQLID', function() {
      expect(typeNameFromGraphQLType({}, GraphQLID)).toBe('GraphQLID?');
    });

    test('should return String? for a custom scalar type', function() {
      expect(typeNameFromGraphQLType({}, new GraphQLScalarType({ name: 'CustomScalarType', serialize: String }))).toBe('String?');
    });

    test('should return a passed through custom scalar type with the passthroughCustomScalars option', function() {
      expect(typeNameFromGraphQLType({ passthroughCustomScalars: true, customScalarsPrefix: '' }, new GraphQLScalarType({ name: 'CustomScalarType', serialize: String }))).toBe('CustomScalarType?');
    });

    test('should return a passed through custom scalar type with a prefix with the customScalarsPrefix option', function() {
      expect(typeNameFromGraphQLType({ passthroughCustomScalars: true, customScalarsPrefix: 'My' }, new GraphQLScalarType({ name: 'CustomScalarType', serialize: String }))).toBe('MyCustomScalarType?');
    });
  });
});
