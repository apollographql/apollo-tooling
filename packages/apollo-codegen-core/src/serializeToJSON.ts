import {
  isType,
  GraphQLType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLObjectType,
  isEnumType,
  isInputObjectType,
  isScalarType,
  isUnionType,
  isInterfaceType,
  parseType,
} from "graphql";

import { LegacyCompilerContext } from "./compiler/legacyIR";
import { CompilerContext, stripProp } from "./compiler";

/**
 * These options are passed from the generate function, which
 * This option needs to be passed to the input object serializer
 * to print the `typeNode` key. We do this here instead of in the
 * compiler, since  modifying the types there get really hacky and unpleasant
 */
interface serializeOptions {
  exposeTypeNodes: boolean;
}

export default function serializeToJSON(
  context: LegacyCompilerContext | CompilerContext,
  options?: serializeOptions
) {
  return serializeAST(
    {
      operations: Object.values(context.operations),
      fragments: Object.values(context.fragments),
      typesUsed: context.typesUsed.map((type) => serializeType(type, options)),
      unionTypes: context.unionTypes.map((type) =>
        serializeType(type, options)
      ),
      interfaceTypes: serializeInterfaceTypes(context.interfaceTypes),
    },
    "\t"
  );
}

export function serializeAST(ast: any, space?: string) {
  return JSON.stringify(
    ast,
    function (_, value) {
      if (isType(value)) {
        return String(value);
      } else {
        return value;
      }
    },
    space
  );
}

function serializeType(type: GraphQLType, options?: serializeOptions) {
  if (isEnumType(type)) {
    return serializeEnumType(type);
  } else if (isInputObjectType(type)) {
    return serializeInputObjectType(type, options);
  } else if (isScalarType(type)) {
    return serializeScalarType(type);
  } else if (isUnionType(type)) {
    return serializeUnionType(type);
  } else {
    throw new Error(`Unexpected GraphQL type: ${type}`);
  }
}

function serializeEnumType(type: GraphQLEnumType) {
  const { name, description } = type;
  const values = type.getValues();

  return {
    kind: "EnumType",
    name,
    description,
    values: values.map((value) => ({
      name: value.name,
      description: value.description,
      isDeprecated: value.isDeprecated,
      deprecationReason: value.deprecationReason,
    })),
  };
}

function serializeInputObjectType(
  type: GraphQLInputObjectType,
  options?: serializeOptions
) {
  const { name, description } = type;
  const fields = Object.values(type.getFields());

  return {
    kind: "InputObjectType",
    name,
    description,
    fields: fields.map((field) => ({
      name: field.name,
      type: String(field.type),
      typeNode:
        options && options.exposeTypeNodes
          ? stripProp("loc", parseType(field.type.toString()))
          : undefined,
      description: field.description,
      defaultValue: field.defaultValue,
    })),
  } as any;
}

function serializeScalarType(type: GraphQLScalarType) {
  const { name, description } = type;

  return {
    kind: "ScalarType",
    name,
    description,
  };
}

function serializeUnionType(type: GraphQLUnionType) {
  const { name } = type;
  return {
    name,
    types: type.getTypes(),
  };
}

function serializeInterfaceTypes(
  interfaceTypes: Map<
    GraphQLInterfaceType,
    (GraphQLObjectType | GraphQLInterfaceType)[]
  >
) {
  const types: {
    name: string;
    types: (GraphQLObjectType | GraphQLInterfaceType)[];
  }[] = [];
  for (let [interfaceType, implementors] of interfaceTypes) {
    types.push({
      name: interfaceType.toString(),
      types: implementors,
    });
  }
  return types;
}
