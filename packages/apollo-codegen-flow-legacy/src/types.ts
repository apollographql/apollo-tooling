import {
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLScalarType,
  isListType,
  isNonNullType
} from "graphql";
import { LegacyCompilerContext } from "apollo-codegen-core/lib/compiler/legacyIR";
import { GraphQLType } from "graphql";

const builtInScalarMap = {
  [GraphQLString.name]: "string",
  [GraphQLInt.name]: "number",
  [GraphQLFloat.name]: "number",
  [GraphQLBoolean.name]: "boolean",
  [GraphQLID.name]: "string"
};

export function typeNameFromGraphQLType(
  context: LegacyCompilerContext,
  type: GraphQLType,
  bareTypeName?: string | null,
  nullable = true
): string {
  if (isNonNullType(type)) {
    return typeNameFromGraphQLType(context, type.ofType, bareTypeName, false);
  }

  let typeName;
  if (isListType(type)) {
    typeName = `Array< ${typeNameFromGraphQLType(
      context,
      type.ofType,
      bareTypeName
    )} >`;
  } else if (type instanceof GraphQLScalarType) {
    typeName =
      builtInScalarMap[type.name] ||
      (context.options.passthroughCustomScalars
        ? context.options.customScalarsPrefix + type.name
        : "any");
  } else {
    typeName = bareTypeName || type.name;
  }

  return nullable ? "?" + typeName : typeName;
}
