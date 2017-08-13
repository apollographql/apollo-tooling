import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType
} from 'graphql';

import { Helpers } from '../../src/swift/helpers';

describe('Swift code generation: Types', () => {
  let helpers: Helpers;

  beforeEach(() => {
    helpers = new Helpers({});
  });

  describe('#typeNameFromGraphQLType()', () => {
    test('should return String? for GraphQLString', () => {
      expect(helpers.typeNameFromGraphQLType(GraphQLString)).toBe('String?');
    });

    test('should return String for GraphQLNonNull(GraphQLString)', () => {
      expect(helpers.typeNameFromGraphQLType(new GraphQLNonNull(GraphQLString))).toBe('String');
    });

    test('should return [String?]? for GraphQLList(GraphQLString)', () => {
      expect(helpers.typeNameFromGraphQLType(new GraphQLList(GraphQLString))).toBe('[String?]?');
    });

    test('should return [String?] for GraphQLNonNull(GraphQLList(GraphQLString))', () => {
      expect(helpers.typeNameFromGraphQLType(new GraphQLNonNull(new GraphQLList(GraphQLString)))).toBe(
        '[String?]'
      );
    });

    test('should return [String]? for GraphQLList(GraphQLNonNull(GraphQLString))', () => {
      expect(helpers.typeNameFromGraphQLType(new GraphQLList(new GraphQLNonNull(GraphQLString)))).toBe(
        '[String]?'
      );
    });

    test('should return [String] for GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))', () => {
      expect(
        helpers.typeNameFromGraphQLType(
          new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))
        )
      ).toBe('[String]');
    });

    test('should return [[String?]?]? for GraphQLList(GraphQLList(GraphQLString))', () => {
      expect(helpers.typeNameFromGraphQLType(new GraphQLList(new GraphQLList(GraphQLString)))).toBe(
        '[[String?]?]?'
      );
    });

    test('should return [[String?]]? for GraphQLList(GraphQLNonNull(GraphQLList(GraphQLString)))', () => {
      expect(
        helpers.typeNameFromGraphQLType(new GraphQLList(new GraphQLNonNull(new GraphQLList(GraphQLString))))
      ).toBe('[[String?]]?');
    });

    test('should return Int? for GraphQLInt', () => {
      expect(helpers.typeNameFromGraphQLType(GraphQLInt)).toBe('Int?');
    });

    test('should return Double? for GraphQLFloat', () => {
      expect(helpers.typeNameFromGraphQLType(GraphQLFloat)).toBe('Double?');
    });

    test('should return Bool? for GraphQLBoolean', () => {
      expect(helpers.typeNameFromGraphQLType(GraphQLBoolean)).toBe('Bool?');
    });

    test('should return GraphQLID? for GraphQLID', () => {
      expect(helpers.typeNameFromGraphQLType(GraphQLID)).toBe('GraphQLID?');
    });

    test('should return String? for a custom scalar type', () => {
      expect(
        helpers.typeNameFromGraphQLType(
          new GraphQLScalarType({ name: 'CustomScalarType', serialize: String })
        )
      ).toBe('String?');
    });

    test('should return a passed through custom scalar type with the passthroughCustomScalars option', () => {
      helpers.options.passthroughCustomScalars = true;
      helpers.options.customScalarsPrefix = '';

      expect(
        helpers.typeNameFromGraphQLType(
          new GraphQLScalarType({ name: 'CustomScalarType', serialize: String })
        )
      ).toBe('CustomScalarType?');
    });

    test('should return a passed through custom scalar type with a prefix with the customScalarsPrefix option', () => {
      helpers.options.passthroughCustomScalars = true;
      helpers.options.customScalarsPrefix = 'My';

      expect(
        helpers.typeNameFromGraphQLType(
          new GraphQLScalarType({ name: 'CustomScalarType', serialize: String })
        )
      ).toBe('MyCustomScalarType?');
    });
  });
});
