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
  GraphQLEnumType,
  isCompositeType,
  isAbstractType
} from 'graphql';

const builtInScalarMap = {
  [GraphQLString.name]: 'String',
  [GraphQLInt.name]: 'Int',
  [GraphQLFloat.name]: 'Double',
  [GraphQLBoolean.name]: 'Boolean',
  [GraphQLID.name]: 'String',
}

export function possibleTypesForType(context, type) {
  if (isAbstractType(type)) {
    return context.schema.getPossibleTypes(type);
  } else {
    return [type];
  }
}

export function typeNameFromGraphQLType(context, type, bareTypeName, isOptional) {
  if (type instanceof GraphQLNonNull) {
    return typeNameFromGraphQLType(context, type.ofType, bareTypeName, isOptional || false)
  } else if (isOptional === undefined) {
    isOptional = true;
  }

  let typeName;
  if (type instanceof GraphQLList) {
    typeName = 'Seq[' + typeNameFromGraphQLType(context, type.ofType, bareTypeName) + ']';
  } else if (type instanceof GraphQLScalarType) {
    typeName = typeNameForScalarType(context, type);
  } else if (type instanceof GraphQLEnumType) {
    typeName = "String";
  } else {
    typeName = bareTypeName || type.name;
  }

  return isOptional ? `Option[${typeName}]` : typeName;
}

function typeNameForScalarType(context, type) {
  return builtInScalarMap[type.name] || (context.passthroughCustomScalars ? context.customScalarsPrefix + type.name: GraphQLString)
}
