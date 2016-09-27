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

export function propertyFromField({ name: fieldName, type: fieldType, fields, fragmentSpreads, inlineFragments }) {
  const name = camelCase(fieldName);

  const isOptional = !(fieldType instanceof GraphQLNonNull || fieldType.ofType instanceof GraphQLNonNull);
  const isList = fieldType instanceof GraphQLList || fieldType.ofType instanceof GraphQLList;

  let property = { name, fieldName, fieldType, isOptional, isList, fragmentSpreads };

  const namedType = getNamedType(fieldType);

  if (namedType instanceof GraphQLScalarType || namedType instanceof GraphQLEnumType) {
    const typeName = typeNameFromGraphQLType(fieldType);
    return { ...property, typeName, isComposite: false };
  } else if (isCompositeType(namedType)) {
    const unmodifiedTypeName = pascalCase(Inflector.singularize(name));
    const properties = propertiesFromFields(fields);
    const subTypes = inlineFragments && inlineFragments.map(({ typeCondition, fields }) =>
      ({ typeName: String(typeCondition), properties: propertiesFromFields(fields) })
    );
    const isPolymorphic = subTypes && subTypes.length > 0;
    return { ...property, unmodifiedTypeName, isComposite: true, properties, isPolymorphic, subTypes };
  } else {
    throw new GraphQLError(`Unsupported field type: ${String(type)}`);
  }
}

export function typeNameForProperty({ fieldType, unmodifiedTypeName }) {
  return typeNameFromGraphQLType(fieldType, unmodifiedTypeName);
}
