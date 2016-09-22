import {
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

export function propertyFromField(field) {
  const name = camelCase(field.name);

  const type = field.type;
  const isList = type instanceof GraphQLList || type.ofType instanceof GraphQLList;

  let property = { name, fieldName: field.name, isList };

  const namedType = getNamedType(type);

  if (namedType instanceof GraphQLScalarType || namedType instanceof GraphQLEnumType) {
    const typeName = typeNameFromGraphQLType(type);
    return { ...property, typeName };
  } else if (isCompositeType(namedType)) {
    const valueTypeName = pascalCase(Inflector.singularize(name));
    const typeName =  typeNameFromGraphQLType(type, valueTypeName);
    const properties = propertiesFromFields(field.subfields);
    return { ...property, typeName, isComposite: true, typeDeclaration: { name : valueTypeName , properties } };
  } else {
    throw Error(`Unsupported field type: ${type}`);
  }
}
