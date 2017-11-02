import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLNonNull,
  GraphQLList,
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

  test('[String]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(GraphQLString))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.nullableTypeAnnotation(
              t.stringTypeAnnotation()
            )
          )
        )
      )
  });

  test('[Int]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(GraphQLInt))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.nullableTypeAnnotation(
              t.numberTypeAnnotation()
            )
          )
        )
      )
  });

  test('[Float]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(GraphQLFloat))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.nullableTypeAnnotation(
              t.numberTypeAnnotation()
            )
          )
        )
      )
  });

  test('[Boolean]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(GraphQLBoolean))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.nullableTypeAnnotation(
              t.booleanTypeAnnotation()
            )
          )
        )
      )
  });

  test('[ID]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(GraphQLID))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.nullableTypeAnnotation(
              t.stringTypeAnnotation()
            )
          )
        )
      )
  })

  test('[String]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(GraphQLString)))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.nullableTypeAnnotation(
            t.stringTypeAnnotation()
          )
        )
      )
  });

  test('[Int]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(GraphQLInt)))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.nullableTypeAnnotation(
            t.numberTypeAnnotation()
          )
        )
      )
  });
  test('[Float]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(GraphQLFloat)))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.nullableTypeAnnotation(
            t.numberTypeAnnotation()
          )
        )
      )
  });

  test('[Boolean]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(GraphQLBoolean)))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.nullableTypeAnnotation(
            t.booleanTypeAnnotation()
          )
        )
      )
  });

  test('[ID]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(GraphQLID)))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.nullableTypeAnnotation(
            t.stringTypeAnnotation()
          )
        )
      )
  });

  test('[String!]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(new GraphQLNonNull(GraphQLString)))
    ).toMatchObject(
      t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.stringTypeAnnotation()
          )
        )
      )
  });

  test('[Int!]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(new GraphQLNonNull((GraphQLInt))))
    ).toMatchObject(
      t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.numberTypeAnnotation()
          )
        )
      )
  })

  test('[Float!]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(new GraphQLNonNull(GraphQLFloat)))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.numberTypeAnnotation()
          )
        )
      )
  });

  test('[Boolean!]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(new GraphQLNonNull(GraphQLBoolean)))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.booleanTypeAnnotation()
          )
        )
      )
  });

  test('[ID!]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(new GraphQLNonNull(GraphQLID)))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.stringTypeAnnotation()
          )
        )
      )
  });

  test('[String!]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLString))))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.stringTypeAnnotation()
        )
      )
  });

  test('[Int!]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLInt))))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.numberTypeAnnotation()
        )
      )
  });

  test('[Float!]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLFloat))))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.numberTypeAnnotation()
        )
      )
  });

  test('[Boolean!]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLBoolean))))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.booleanTypeAnnotation()
        )
      )
  });

  test('[ID!]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(new GraphQLNonNull(GraphQLID))))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.stringTypeAnnotation()
        )
      )
  });

  test('[[String]]', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLList(new GraphQLList(GraphQLString)))
    ).toMatchObject(
        t.nullableTypeAnnotation(
          t.arrayTypeAnnotation(
            t.nullableTypeAnnotation(
              t.arrayTypeAnnotation(
                t.nullableTypeAnnotation(
                  t.stringTypeAnnotation()
                )
              )
            )
          )
        )
      )
  });

  test('[[String]]!', () => {
    expect(
      typeAnnotationFromGraphQLType(new GraphQLNonNull(new GraphQLList(new GraphQLList(GraphQLString))))
    ).toMatchObject(
        t.arrayTypeAnnotation(
          t.nullableTypeAnnotation(
            t.arrayTypeAnnotation(
              t.nullableTypeAnnotation(
                t.stringTypeAnnotation()
              )
            )
          )
        )
      )
  });

  // TODO: Add more list test cases

});
