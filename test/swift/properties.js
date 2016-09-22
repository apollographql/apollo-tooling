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

import { propertyFromField } from '../../src/swift/properties'

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
      fragmentNames: ['HeroDetails'],
      subfields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(property, {
      name: 'hero',
      typeName: 'Hero?',
      unmodifiedTypeName: 'Hero',
      isComposite: true,
      fragmentNames: ['HeroDetails'],
      subproperties: [
        { name: 'name', typeName: 'String?' }
      ]
    });
  });

  it('should return a property for a non-null composite field', () => {
    const field = {
      name: 'hero',
      type: new GraphQLNonNull(schema.getType('Character')),
      fragmentNames: ['HeroDetails'],
      subfields: [ { name: 'name', type: GraphQLString} ]
    };
    const property = propertyFromField(field);

    assert.containSubset(property, {
      name: 'hero',
      typeName: 'Hero',
      unmodifiedTypeName: 'Hero',
      isComposite: true,
      fragmentNames: ['HeroDetails'],
      subproperties: [
        { name: 'name', typeName: 'String?' }
      ]
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
      unmodifiedTypeName: 'Friend',
      isList: true,
      isComposite: true,
      subproperties: [
        { name: 'name', typeName: 'String?' }
      ]
    });
  });
});
