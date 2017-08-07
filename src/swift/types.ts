import { LegacyCompilerContext } from '../compiler/legacyIR';

import {
  GraphQLType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLCompositeType,
  isCompositeType,
  isAbstractType,
  GraphQLObjectType
} from 'graphql';

const builtInScalarMap = {
  [GraphQLString.name]: 'String',
  [GraphQLInt.name]: 'Int',
  [GraphQLFloat.name]: 'Double',
  [GraphQLBoolean.name]: 'Bool',
  [GraphQLID.name]: 'GraphQLID'
};

export function possibleTypesForType(context: LegacyCompilerContext, type: GraphQLCompositeType): GraphQLObjectType[] {
  if (isAbstractType(type)) {
    return context.schema.getPossibleTypes(type);
  } else {
    return [type];
  }
}

export function typeNameFromGraphQLType(
  context: LegacyCompilerContext,
  type: GraphQLType,
  bareTypeName?: string,
  isOptional?: boolean
): string {
  if (type instanceof GraphQLNonNull) {
    return typeNameFromGraphQLType(context, type.ofType, bareTypeName, isOptional || false);
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

function typeNameForScalarType(context: LegacyCompilerContext, type: GraphQLScalarType): string {
  return (
    builtInScalarMap[type.name] ||
    (context.options.passthroughCustomScalars
      ? context.options.customScalarsPrefix + type.name
      : GraphQLString.name)
  );
}

export function fieldTypeEnum(context: LegacyCompilerContext, type: GraphQLType, structName: string): string {
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
  } else {
    throw new Error(`Unknown field type: ${type}`);
  }
}
