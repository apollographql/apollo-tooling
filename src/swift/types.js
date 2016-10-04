import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing';

import { camelCase } from 'change-case';

import {
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLEnumType
} from 'graphql';

export function typeNameFromGraphQLType(type, bareTypeName, nullable = true) {
  if (type instanceof GraphQLNonNull) {
    return typeNameFromGraphQLType(type.ofType, bareTypeName, false)
  }

  let typeName;
  if (type instanceof GraphQLList) {
    typeName = '[' + typeNameFromGraphQLType(type.ofType, bareTypeName, true) + ']';
  } else if (type === GraphQLID) {
    typeName = 'GraphQLID'
  } else {
    typeName = bareTypeName || type.name;
  }

  return nullable ? typeName + '?' : typeName;
}

export function typeDeclarationForGraphQLType(generator, type) {
  if (type instanceof GraphQLEnumType) {
    return enumerationDeclaration(generator, type);
  }
}

function enumerationDeclaration(generator, type) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  generator.printOnNewline(description && `/// ${description}`);
  generator.printOnNewline(`public enum ${name}: String`);
  generator.withinBlock(() => {
    values.forEach(value =>
      generator.printOnNewline(`case ${camelCase(value.name)} = "${value.value}"${wrap(' /// ', value.description)}`)
    );
  });
  generator.printNewline();
  generator.printOnNewline(`extension ${name}: JSONDecodable, JSONEncodable {}`);
}
