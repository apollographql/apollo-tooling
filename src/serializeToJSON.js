import {
  isType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLInputObjectType,
} from 'graphql';

export default function serializeToJSON(context) {
  return serializeAST({
    operations: Object.values(context.operations),
    fragments: Object.values(context.fragments),
    typesUsed: context.typesUsed.map(serializeType),
  }, '\t');
}

export function serializeAST(ast, space) {
  return JSON.stringify(ast, function(key, value) {
    if (isType(value)) {
      return String(value);
    } else {
      return value;
    }
  }, space);
}

function serializeType(type) {
  if (type instanceof GraphQLEnumType) {
    return serializeEnumType(type);
  } else if (type instanceof GraphQLInputObjectType) {
    return serializeInputObjectType(type);
  } else if (type instanceof GraphQLScalarType) {
    return serializeScalarType(type);
  }
}

function serializeEnumType(type) {
  const { name, description } = type;
  const values = type.getValues();

  return {
    kind: 'EnumType',
    name,
    description,
    values: values.map(value => (
      {
        name: value.name,
        description: value.description,
        isDeprecated: value.isDeprecated,
        deprecationReason: value.deprecationReason
      }
    ))
  }
}

function serializeInputObjectType(type) {
  const { name, description } = type;
  const fields = Object.values(type.getFields());

  return {
    kind: 'InputObjectType',
    name,
    description,
    fields
  }
}

function serializeScalarType(type) {
  const { name, description } = type;

  return {
    kind: 'ScalarType',
    name,
    description
  }
}
