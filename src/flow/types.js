import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing';

import { camelCase } from 'change-case';

import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType
} from 'graphql';

const builtInScalarMap = {
  [GraphQLString.name]: 'string',
  [GraphQLInt.name]: 'number',
  [GraphQLFloat.name]: 'number',
  [GraphQLBoolean.name]: 'boolean',
  [GraphQLID.name]: 'string',
}

export function typeNameFromGraphQLType(context, type, bareTypeName, nullable = true) {
  if (type instanceof GraphQLNonNull) {
    return typeNameFromGraphQLType(context, type.ofType, bareTypeName, false)
  }

  let typeName;
  if (type instanceof GraphQLList) {
    typeName = `Array< ${typeNameFromGraphQLType(context, type.ofType, bareTypeName)} >`;
  } else if (type instanceof GraphQLScalarType) {
    typeName = builtInScalarMap[type.name] || (context.passthroughCustomScalars ? context.customScalarsPrefix + type.name : 'any');
  } else {
    typeName = bareTypeName || type.name;
  }

  return nullable ? '?' + typeName : typeName;
}
