import {
  GraphQLBoolean,
  GraphQLFloat,
  GraphQLInt,
  GraphQLID,
  GraphQLScalarType,
  GraphQLString,
  GraphQLType,
  isListType,
  isNonNullType
} from "graphql";

import * as t from "@babel/types";

import { CompilerOptions } from "apollo-codegen-core/lib/compiler";

const builtInScalarMap = {
  [GraphQLString.name]: t.stringTypeAnnotation(),
  [GraphQLInt.name]: t.numberTypeAnnotation(),
  [GraphQLFloat.name]: t.numberTypeAnnotation(),
  [GraphQLBoolean.name]: t.booleanTypeAnnotation(),
  [GraphQLID.name]: t.stringTypeAnnotation()
};

export interface FlowCompilerOptions extends CompilerOptions {
  useReadOnlyTypes: boolean;
}

export function createTypeAnnotationFromGraphQLTypeFunction(
  compilerOptions: FlowCompilerOptions
): Function {
  const arrayType = compilerOptions.useReadOnlyTypes
    ? "$ReadOnlyArray"
    : "Array";

  function nonNullableTypeAnnotationFromGraphQLType(
    type: GraphQLType,
    typeName?: string
  ): t.FlowTypeAnnotation {
    if (isListType(type)) {
      return t.genericTypeAnnotation(
        t.identifier(arrayType),
        t.typeParameterInstantiation([
          typeAnnotationFromGraphQLType(type.ofType, typeName)
        ])
      );
    } else if (type instanceof GraphQLScalarType) {
      const builtIn = builtInScalarMap[typeName || type.name];
      if (builtIn != null) {
        return builtIn;
      } else if (compilerOptions.passthroughCustomScalars) {
        return t.genericTypeAnnotation(
          t.identifier(
            (compilerOptions.customScalarsPrefix || "") +
              (typeName || type.name)
          )
        );
      } else {
        return t.anyTypeAnnotation();
      }
    } else if (isNonNullType(type)) {
      // This won't happen; but for TypeScript completeness:
      return typeAnnotationFromGraphQLType(type.ofType, typeName);
    } else {
      return t.genericTypeAnnotation(t.identifier(typeName || type.name));
    }
  }

  function typeAnnotationFromGraphQLType(
    type: GraphQLType,
    typeName?: string
  ): t.FlowTypeAnnotation {
    if (isNonNullType(type)) {
      return nonNullableTypeAnnotationFromGraphQLType(type.ofType, typeName);
    } else {
      return t.nullableTypeAnnotation(
        nonNullableTypeAnnotationFromGraphQLType(type, typeName)
      );
    }
  }

  return typeAnnotationFromGraphQLType;
}
