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

import * as t from '@babel/types';

import { CompilerOptions } from '../../compiler';

const builtInScalarMap = {
  [GraphQLString.name]: t.stringTypeAnnotation(),
  [GraphQLInt.name]: t.numberTypeAnnotation(),
  [GraphQLFloat.name]: t.numberTypeAnnotation(),
  [GraphQLBoolean.name]: t.booleanTypeAnnotation(),
  [GraphQLID.name]: t.stringTypeAnnotation(),
}

export interface TypeAnnotationFromGraphQLTypeOptions {
  replaceObjectTypeIdentifierWith?: t.Identifier;
}

type createTypeAnnotationFromGraphQLTypeFn = (
  graphQLType: GraphQLType,
  options?: TypeAnnotationFromGraphQLTypeOptions
) => t.FlowTypeAnnotation;

export function createTypeAnnotationFromGraphQLTypeFunction(
  compilerOptions: CompilerOptions
): createTypeAnnotationFromGraphQLTypeFn {
  return function typeAnnotationFromGraphQLType(graphQLType: GraphQLType, {
    nullable = true,
    replaceObjectTypeIdentifierWith
  }: {
    nullable?: boolean;
    replaceObjectTypeIdentifierWith?: t.Identifier
  } = {
    nullable: true
  }): t.FlowTypeAnnotation {
    if (graphQLType instanceof GraphQLNonNull) {
      return typeAnnotationFromGraphQLType(
        graphQLType.ofType,
        { nullable: false, replaceObjectTypeIdentifierWith }
      );
    }

    if (graphQLType instanceof GraphQLList) {
      const elementType = typeAnnotationFromGraphQLType(graphQLType.ofType, {
        replaceObjectTypeIdentifierWith,
        nullable: true
      });

      const typeAnnotation = t.arrayTypeAnnotation(elementType);

      if (nullable) {
        return t.nullableTypeAnnotation(typeAnnotation);
      } else {
        return typeAnnotation;
      }
    }

    let typeAnnotation: t.FlowTypeAnnotation;
    if (graphQLType instanceof GraphQLScalarType) {
      const builtIn = builtInScalarMap[graphQLType.name]
      if (builtIn) {
        typeAnnotation = builtIn;
      } else {
        if (compilerOptions.passthroughCustomScalars) {
          typeAnnotation = t.anyTypeAnnotation();
        } else {
          typeAnnotation = t.genericTypeAnnotation(
            t.identifier(graphQLType.name)
          );
        }
      }
    } else {
      typeAnnotation = t.genericTypeAnnotation(
        replaceObjectTypeIdentifierWith ? replaceObjectTypeIdentifierWith : t.identifier(graphQLType.name)
      );
    }

    if (nullable) {
      return t.nullableTypeAnnotation(typeAnnotation);
    } else {
      return typeAnnotation;
    }
  }
}
