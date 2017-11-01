import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLType,
  GraphQLNonNull,
  GraphQLList
} from 'graphql'

import * as t from 'babel-types';

const builtInScalarMap = {
  [GraphQLString.name]: t.stringTypeAnnotation(),
  [GraphQLInt.name]: t.numberTypeAnnotation(),
  [GraphQLFloat.name]: t.numberTypeAnnotation(),
  [GraphQLBoolean.name]: t.booleanTypeAnnotation(),
  [GraphQLID.name]: t.stringTypeAnnotation(),
}

export function typeAnnotationFromGraphQLType(type: GraphQLType, {
  nullable
} = {
  nullable: true
}) {
  if (type instanceof GraphQLNonNull) {
    return typeAnnotationFromGraphQLType(type.ofType, {nullable: false});
  }

  if (type instanceof GraphQLList) {
    const bareTypeAnnotation = t.arrayTypeAnnotation(
      typeAnnotationFromGraphQLType(type.ofType)
    );
    if (nullable) {
      return t.nullableTypeAnnotation(bareTypeAnnotation);
    } else {
      return bareTypeAnnotation;
    }
  }

  const bareTypeAnnotation = builtInScalarMap[type.name];
  if (nullable) {
    return t.nullableTypeAnnotation(bareTypeAnnotation);
  } else {
    return bareTypeAnnotation;
  }
}
