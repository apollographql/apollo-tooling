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
  [GraphQLBoolean.name]: 'Bool',
  [GraphQLID.name]: 'GraphQLID',
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
    typeName = '[' + typeNameFromGraphQLType(context, type.ofType, bareTypeName) + ']';
  } else if (type instanceof GraphQLScalarType) {
    typeName = typeNameForScalarType(context, type);
  } else {
    typeName = bareTypeName || type.name;
  }

  return isOptional ? typeName + '?' : typeName;
}

function typeNameForScalarType(context, type) {
  return builtInScalarMap[type.name] || (context.passthroughCustomScalars ? context.customScalarsPrefix + type.name: GraphQLString)
}

export function fieldTypeEnum(context, type, structName) {
  if (type instanceof GraphQLNonNull) {
    return `.nonNull(${fieldTypeEnum(context, type.ofType, structName)})`;
  } else if (type instanceof GraphQLList) {
    return `.list(${fieldTypeEnum(context, type.ofType, structName)})`;
  } else if (type instanceof GraphQLScalarType) {
    return `.scalar(${typeNameForScalarType(context, type)}.self)`;
  } else if (type instanceof GraphQLEnumType) {
    return `.scalar(${type.name}.self)`;
  } else if (isCompositeType(type)) {
    return `.object(${structName}.self)`;
  }
}
