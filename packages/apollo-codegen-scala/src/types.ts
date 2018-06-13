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
  isAbstractType
} from 'graphql';
import { LegacyCompilerContext } from 'apollo-codegen-core/lib/compiler/legacyIR';
import { GraphQLType } from 'graphql';

const builtInScalarMap = {
  [GraphQLString.name]: 'String',
  [GraphQLInt.name]: 'Int',
  [GraphQLFloat.name]: 'Double',
  [GraphQLBoolean.name]: 'Boolean',
  [GraphQLID.name]: 'String',
}

export function possibleTypesForType(context: LegacyCompilerContext, type: GraphQLType) {
  if (isAbstractType(type)) {
    return context.schema.getPossibleTypes(type);
  } else {
    return [type];
  }
}

export function typeNameFromGraphQLType(context: LegacyCompilerContext, type: GraphQLType, bareTypeName?: string, isOptional?: boolean, isInputObject?: boolean): string {
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

  return isOptional ? (isInputObject ? `scala.scalajs.js.UndefOr[${typeName}]` : `Option[${typeName}]`) : typeName;
}

function typeNameForScalarType(context: LegacyCompilerContext, type: GraphQLScalarType): string {
  return builtInScalarMap[type.name] || (context.options.passthroughCustomScalars ? context.options.customScalarsPrefix + type.name : GraphQLString.name)
}
