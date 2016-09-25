import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID
} from 'graphql';

import { camelCase, pascalCase } from 'change-case';
import Inflector from 'inflected'

import { typeNameFromGraphQLType } from './types';

export function propertiesFromFields(fields) {
  return fields.map(field => propertyFromField(field));
}

export function propertyFromField({ name: fieldName, type, fields, fragmentSpreads, inlineFragments }) {
  const name = camelCase(fieldName);

  const isList = type instanceof GraphQLList || type.ofType instanceof GraphQLList;

  let property = { name, fieldName, isList, fragmentSpreads };

  const namedType = getNamedType(type);

  if (namedType instanceof GraphQLScalarType || namedType instanceof GraphQLEnumType) {
    const typeName = typeNameFromGraphQLType(type);
    return { ...property, typeName };
  } else if (isCompositeType(namedType)) {
    const unmodifiedTypeName = pascalCase(Inflector.singularize(name));
    const typeName =  typeNameFromGraphQLType(type, unmodifiedTypeName);
    const properties = propertiesFromFields(fields);
    inlineFragments = inlineFragments && inlineFragments.map(({ typeCondition, fields }) =>
      ({ typeCondition, properties: propertiesFromFields(fields) })
    );
    return { ...property, typeName, unmodifiedTypeName, isComposite: true, properties, inlineFragments };
  } else {
    throw new GraphQLError(`Unsupported field type: ${String(type)}`);
  }
}
