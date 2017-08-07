import { LegacyCompilerContext } from '../compiler/legacyIR';

import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLType
} from 'graphql';

const builtInScalarMap = {
  [GraphQLString.name]: 'string',
  [GraphQLInt.name]: 'number',
  [GraphQLFloat.name]: 'number',
  [GraphQLBoolean.name]: 'boolean',
  [GraphQLID.name]: 'string',
}

export function typeNameFromGraphQLType(context: LegacyCompilerContext, type: GraphQLType, bareTypeName?: string | null, nullable = true): string {
  if (type instanceof GraphQLNonNull) {
    return typeNameFromGraphQLType(context, type.ofType, bareTypeName, false)
  }

  let typeName;
  if (type instanceof GraphQLList) {
    typeName = `Array< ${typeNameFromGraphQLType(context, type.ofType, bareTypeName, true)} >`;
  } else if (type instanceof GraphQLScalarType) {
    typeName = builtInScalarMap[type.name] || (context.options.passthroughCustomScalars ? context.options.customScalarsPrefix + type.name : builtInScalarMap[GraphQLString.name]);
  } else {
    typeName = bareTypeName || type.name;
  }

  return nullable ? typeName + ' | null' : typeName;
}
