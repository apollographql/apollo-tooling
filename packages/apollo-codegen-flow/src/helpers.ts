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

import { CompilerOptions } from 'apollo-codegen-core/lib/compiler';

const builtInScalarMap = {
  [GraphQLString.name]: t.stringTypeAnnotation(),
  [GraphQLInt.name]: t.numberTypeAnnotation(),
  [GraphQLFloat.name]: t.numberTypeAnnotation(),
  [GraphQLBoolean.name]: t.booleanTypeAnnotation(),
  [GraphQLID.name]: t.stringTypeAnnotation(),
}

export interface FlowCompilerOptions extends CompilerOptions {
  useFlowReadOnlyTypes: boolean;
}

export function createTypeAnnotationFromGraphQLTypeFunction(
  compilerOptions: FlowCompilerOptions
): Function {
  const arrayType = compilerOptions.useFlowReadOnlyTypes ? '$ReadOnlyArray' : 'Array';

  function nonNullableTypeAnnotationFromGraphQLType(type: GraphQLType, typeName?: string): t.FlowTypeAnnotation {
    if (type instanceof GraphQLList) {
      return t.genericTypeAnnotation(
        t.identifier(arrayType),
        t.typeParameterInstantiation([typeAnnotationFromGraphQLType(type.ofType, typeName)]),
      );
    } else if (type instanceof GraphQLScalarType) {
      const builtIn = builtInScalarMap[typeName || type.name]
      if (builtIn != null) {
        return builtIn;
      } else if (compilerOptions.passthroughCustomScalars) {
        return t.genericTypeAnnotation(t.identifier((compilerOptions.customScalarsPrefix || '') + (typeName || type.name)));
      } else {
        return t.anyTypeAnnotation();
      }
    } else if (type instanceof GraphQLNonNull) {
      // This won't happen; but for TypeScript completeness:
      return typeAnnotationFromGraphQLType(type.ofType, typeName);
    } else {
      return t.genericTypeAnnotation(t.identifier(typeName || type.name));
    }
  }

  function typeAnnotationFromGraphQLType(type: GraphQLType, typeName?: string): t.FlowTypeAnnotation {
    if (type instanceof GraphQLNonNull) {
      return nonNullableTypeAnnotationFromGraphQLType(type.ofType, typeName);
    } else {
      return t.nullableTypeAnnotation(nonNullableTypeAnnotationFromGraphQLType(type, typeName));
    }
  }

  return typeAnnotationFromGraphQLType;
}
