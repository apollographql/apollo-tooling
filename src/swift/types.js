import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing.js';

import { camelCase } from 'change-case';

import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType
} from 'graphql';

export function typeNameFromGraphQLType(type, unwrappedName, nullable = true) {
  if (type instanceof GraphQLNonNull) {
    return typeNameFromGraphQLType(type.ofType, unwrappedName, false)
  }

  let typeName;
  if (type instanceof GraphQLList) {
    typeName = '[' + typeNameFromGraphQLType(type.ofType, unwrappedName, true) + ']';
  } else if (type === GraphQLID) {
    typeName = 'GraphQLID'
  } else {
    typeName = unwrappedName || type.name;
  }

  return nullable ? typeName + '?' : typeName;
}

export function typeDeclarationForGraphQLType(type) {
  if (type instanceof GraphQLEnumType) {
    return enumerationDeclaration(type);
  }
}

function enumerationDeclaration(type) {
  const { name, description } = type;
  const values = type.getValues();

  const caseDeclarations = values.map(value =>
    `case ${camelCase(value.name)} = "${value.value}"${wrap(' /// ', value.description)}`
  );

  return join([
    description && `/// ${description}\n`,
    `public enum ${name}: String `,
    block(caseDeclarations),
    '\n\n',
    `extension ${name}: JSONDecodable, JSONEncodable {}`
  ]);
}
