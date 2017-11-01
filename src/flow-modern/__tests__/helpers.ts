import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLNonNull
} from 'graphql';

import * as t from 'babel-types';

import { typeAnnotationFromGraphQLType } from '../helpers';

describe('typeAnnotationFromGraphQLType', () => {
  test('String', () => {
    expect(typeAnnotationFromGraphQLType(GraphQLString))
      .toMatchObject(
        t.nullableTypeAnnotation(
          t.stringTypeAnnotation()
        )
      );
  });

  test('Int', () => {
    expect(typeAnnotationFromGraphQLType(GraphQLInt))
      .toMatchObject(
        t.nullableTypeAnnotation(
          t.numberTypeAnnotation()
        )
      );
  });

  test('Float', () => {
    expect(typeAnnotationFromGraphQLType(GraphQLFloat))
      .toMatchObject(
        t.nullableTypeAnnotation(
          t.numberTypeAnnotation()
        )
      );
  });

  test('Boolean', () => {
    expect(typeAnnotationFromGraphQLType(GraphQLBoolean))
      .toMatchObject(
        t.nullableTypeAnnotation(
          t.booleanTypeAnnotation()
        )
      );
  });

  test('ID', () => {
    expect(typeAnnotationFromGraphQLType(GraphQLID))
      .toMatchObject(
        t.nullableTypeAnnotation(
          t.stringTypeAnnotation()
        )
      );
  });

  test('String!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(GraphQLString))
    ).toMatchObject(t.stringTypeAnnotation());
  });

  test('Int!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(GraphQLInt))
    ).toMatchObject(t.numberTypeAnnotation());
  });

  test('Float!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(GraphQLFloat))
    ).toMatchObject(t.numberTypeAnnotation());
  });

  test('Boolean!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(GraphQLBoolean))
    ).toMatchObject(t.booleanTypeAnnotation());
  });

  test('ID!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(GraphQLID))
    ).toMatchObject(t.stringTypeAnnotation());
  });

  // TODO: Test GenericTypeAnnotation

  test('[String]')
  test('[Int]')
  test('[Float]')
  test('[Boolean]')
  test('[ID]')

  test('[String]!')
  test('[Int]!')
  test('[Float]!')
  test('[Boolean]!')
  test('[ID]!')

  test('[String!]')
  test('[Int!]')
  test('[Float!]')
  test('[Boolean!]')
  test('[ID!]')

  test('[String!]!')
  test('[Int!]!')
  test('[Float!]!')
  test('[Boolean!]!')
  test('[ID!]!')

  test('[[String]]')
  test('[[String]]!')
  // TODO: Add more list test cases

});
