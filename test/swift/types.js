import { assert } from 'chai'

import { stripIndent } from 'common-tags'

import {
  GraphQLID,
  GraphQLString,
  GraphQLList,
  GraphQLNonNull
} from 'graphql';

import { typeNameFromGraphQLType, typeDeclarationForGraphQLType } from '../../src/swift/types'

import { loadSchema } from '../../src/generate'

const schema = loadSchema(require.resolve('../starwars/schema.json'));

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

describe('#typeNameFromGraphQLType()', () => {
  it('should return an enum declaration for a GraphQLEnumType', () => {
    assert.equal(typeDeclarationForGraphQLType(schema.getType('Episode')), stripIndent`
      /// The episodes in the Star Wars trilogy
      public enum Episode: String {
        case newhope = "NEWHOPE" /// Star Wars Episode IV: A New Hope, released in 1977.
        case empire = "EMPIRE" /// Star Wars Episode V: The Empire Strikes Back, released in 1980.
        case jedi = "JEDI" /// Star Wars Episode VI: Return of the Jedi, released in 1983.
      }

      extension Episode: JSONDecodable, JSONEncodable {}`
    );
  });
});
