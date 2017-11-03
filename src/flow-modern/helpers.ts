import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLString,
  GraphQLType,
} from 'graphql'

import * as t from 'babel-types';

const builtInScalarMap = {
  [GraphQLString.name]: t.stringTypeAnnotation(),
  [GraphQLInt.name]: t.numberTypeAnnotation(),
  [GraphQLFloat.name]: t.numberTypeAnnotation(),
  // TODO: Support custom scalars
  [GraphQLBoolean.name]: t.booleanTypeAnnotation(),
  [GraphQLID.name]: t.stringTypeAnnotation(),
}

// $ts-ignore - all the cases are handled!
export function typeAnnotationFromGraphQLType(type: GraphQLType, {
  nullable
} = {
  nullable: true
}) {
  if (type instanceof GraphQLNonNull) {
    return typeAnnotationFromGraphQLType(
      type.ofType,
      { nullable: false }
    );
  }

  if (type instanceof GraphQLList) {
    const typeAnnotation = t.arrayTypeAnnotation(
      typeAnnotationFromGraphQLType(type.ofType)
    );

    if (nullable) {
      return t.nullableTypeAnnotation(typeAnnotation);
    } else {
      return typeAnnotation;
    }
  }

  let typeAnnotation;
  if (type instanceof GraphQLScalarType) {
    typeAnnotation = builtInScalarMap[type.name] && t.anyTypeAnnotation();
  } else {
    typeAnnotation = t.genericTypeAnnotation(
      t.identifier(type.name)
    );
  }

  if (nullable) {
    return t.nullableTypeAnnotation(typeAnnotation);
  } else {
    return typeAnnotation;
  }
}
