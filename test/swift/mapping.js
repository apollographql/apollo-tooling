import chai, { assert } from 'chai'
import chaiSubset from 'chai-subset'
chai.use(chaiSubset);

import {
  buildClientSchema,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import { propertyFromField, typeNameFromGraphQLType } from '../../src/swift/mapping'

const schemaData = require('../starwars/schema.json');
const schema = buildClientSchema(schemaData);

describe('#propertyFromField()', () => {
  it('should return a property for a scalar field', () => {
    const field = { name: 'name', type: GraphQLString };
    const property = propertyFromField(field);

    assert.containSubset(property, { name: 'name', typeName: 'String?' });
  });

  it('should return a property for a non-null scalar field', () => {
    const field = { name: 'name', type: new GraphQLNonNull(GraphQLString) };
    const property = propertyFromField(field);

    assert.containSubset(property, { name: 'name', typeName: 'String' });
  });

  it('should return a property for a list field', () => {
    const field = { name: 'name', type: new GraphQLList(GraphQLString) };
    const property = propertyFromField(field);

    assert.containSubset(property, { name: 'name', typeName: '[String?]?' });
  });

  it('should return a property for a non-null list field', () => {
    const field = { name: 'name', type: new GraphQLNonNull(new GraphQLList(GraphQLString)) };
    const property = propertyFromField(field);

    assert.containSubset(property, { name: 'name', typeName: '[String?]', isList: true });
  });

  it('should return a property for a composite field', () => {
    const field = {
      name: 'hero',
      type: schema.getType('Character'),
      subfields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(property, {
      name: 'hero',
      typeName: 'Hero?',
      isComposite: true,
      typeDeclaration: {
        name: 'Hero',
        properties: [
          { name: 'name', typeName: 'String?' }
        ]
      }
    });
  });

  it('should return a property for a non-null composite field', () => {
    const field = {
      name: 'hero',
      type: new GraphQLNonNull(schema.getType('Character')),
      subfields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(property, {
      name: 'hero',
      typeName: 'Hero',
      isComposite: true,
      typeDeclaration: {
        name: 'Hero',
        properties: [
          { name: 'name', typeName: 'String?' }
        ]
      }
    });
  });

  it('should return a property for a list field with a composite element type', () => {
    const field = {
      name: 'friends',
      type: new GraphQLList(schema.getType('Character')),
      subfields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(property, {
      name: 'friends',
      typeName: '[Friend?]?',
      isList: true,
      isComposite: true,
      typeDeclaration: {
        name: 'Friend',
        properties: [
          { name: 'name', typeName: 'String?' }
        ]
      }
    });
  });
});

describe('#typeNameFromGraphQLType()', () => {
  it('should return GraphQLID? for GraphQLID', () => {
    assert.equal(typeNameFromGraphQLType(GraphQLID), 'GraphQLID?');
  });

  it('should return String? for GraphQLString', () => {
    assert.equal(typeNameFromGraphQLType(GraphQLString), 'String?');
  });

  it('should return String for GraphQLNonNull(GraphQLString)', () => {
    assert.equal(typeNameFromGraphQLType(new GraphQLNonNull(GraphQLString)), 'String');
  });

  it('should return [String?]? for GraphQLList(GraphQLString)', () => {
    assert.equal(typeNameFromGraphQLType(new GraphQLList(GraphQLString)), '[String?]?');
  });

  it('should return [String?] for GraphQLNonNull(GraphQLList(GraphQLString))', () => {
    assert.equal(typeNameFromGraphQLType(new GraphQLNonNull(new GraphQLList(GraphQLString))), '[String?]');
  });

  it('should return [String]? for GraphQLList(GraphQLNonNull(GraphQLString))', () => {
    assert.equal(typeNameFromGraphQLType(new GraphQLList(new GraphQLNonNull(GraphQLString))), '[String]?');
  });

  it('should return [String] for GraphQLNonNull(GraphQLList(GraphQLNonNull(GraphQLString)))', () => {
    assert.equal(typeNameFromGraphQLType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString)))), '[String]');
  });
});
