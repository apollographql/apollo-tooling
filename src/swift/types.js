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
  [GraphQLString.name]: 'String',
  [GraphQLInt.name]: 'Int',
  [GraphQLFloat.name]: 'Float',
  [GraphQLBoolean.name]: 'Bool',
  [GraphQLID.name]: 'GraphQLID',
}

export function typeNameFromGraphQLType(context, type, bareTypeName, isOptional) {
  if (type instanceof GraphQLNonNull) {
    return typeNameFromGraphQLType(context, type.ofType, bareTypeName, isOptional || false)
  } else if (isOptional === undefined) {
    isOptional = true;
  }

  let typeName;
  if (type instanceof GraphQLList) {
    typeName = '[' + typeNameFromGraphQLType(context, type.ofType, bareTypeName) + ']';
  } else if (type instanceof GraphQLScalarType) {
    typeName = builtInScalarMap[type.name] || (context.passthroughCustomScalars ? type.name: GraphQLString);
  } else {
    typeName = bareTypeName || type.name;
  }

  return isOptional ? typeName + '?' : typeName;
}
