import chai, { assert } from 'chai'
import chaiSubset from 'chai-subset'
chai.use(chaiSubset);

import {
  buildClientSchema,
  isType,
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import { propertyFromField } from '../../src/swift/properties'

const schemaData = require('../starwars/schema.json');
const schema = buildClientSchema(schemaData);

describe('#propertyFromField()', () => {
  it('should return a property for a scalar field', () => {
    const field = { name: 'name', type: GraphQLString };
    const property = propertyFromField(field);

    assert.containSubset(stringify(property), {
      name: 'name',
      typeName: 'String?',
      isOptional: true,
      isList: false,
      isComposite: false
    });
  });

  it('should return a property for a non-null scalar field', () => {
    const field = { name: 'name', type: new GraphQLNonNull(GraphQLString) };
    const property = propertyFromField(field);

    assert.containSubset(stringify(property), {
      name: 'name',
      typeName: 'String',
      isOptional: false,
      isList: false,
      isComposite: false
    });
  });

  it('should return a property for a list field', () => {
    const field = { name: 'name', type: new GraphQLList(GraphQLString) };
    const property = propertyFromField(field);

    assert.containSubset(stringify(property), {
      name: 'name',
      typeName: '[String?]?',
      isOptional: true,
      isList: true,
      isComposite: false
    });
  });

  it('should return a property for a non-null list field', () => {
    const field = { name: 'name', type: new GraphQLNonNull(new GraphQLList(GraphQLString)) };
    const property = propertyFromField(field);

    assert.containSubset(stringify(property), {
      name: 'name',
      typeName: '[String?]',
      isOptional: false,
      isList: true,
      isComposite: false
    });
  });

  it('should return a property for a composite field', () => {
    const field = {
      name: 'hero',
      type: schema.getType('Character'),
      fragmentSpreads: ['HeroDetails'],
      fields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(stringify(property), {
      name: 'hero',
      unmodifiedTypeName: 'Hero',
      isOptional: true,
      isList: false,
      isComposite: true,
      fragmentSpreads: ['HeroDetails'],
      properties: [
        { name: 'name', typeName: 'String?' }
      ]
    });
  });

  it('should return a property for a non-null composite field', () => {
    const field = {
      name: 'hero',
      type: new GraphQLNonNull(schema.getType('Character')),
      fragmentSpreads: ['HeroDetails'],
      fields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(stringify(property), {
      name: 'hero',
      unmodifiedTypeName: 'Hero',
      isOptional: false,
      isList: false,
      isComposite: true,
      fragmentSpreads: ['HeroDetails'],
      properties: [
        { name: 'name', typeName: 'String?' }
      ]
    });
  });

  it('should return a property for a list field with a composite element type', () => {
    const field = {
      name: 'friends',
      type: new GraphQLList(schema.getType('Character')),
      fields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(stringify(property), {
      name: 'friends',
      unmodifiedTypeName: 'Friend',
      isOptional: true,
      isList: true,
      isComposite: true,
      properties: [
        { name: 'name', typeName: 'String?' }
      ]
    });
  });
});

function stringify(ast) {
  return JSON.parse(JSON.stringify(ast, function(key, value) {
    if (isType(value)) {
      return String(value);
    }
    return value;
  }));
}
