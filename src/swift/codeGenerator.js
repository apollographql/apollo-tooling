import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing.js';

import { camelCase, pascalCase } from 'change-case';

import {
  visit,
  visitWithTypeInfo,
  TypeInfo,
  GraphQLEnumType
} from 'graphql';

import { propertiesFromFields, typeNameFromGraphQLType } from './mapping'

export function generateSource(context) {
  const typeDefinitions = context.typesUsed.map(type => typeDeclarationForGraphQLType(type));
  const classDefinitions = context.queries.map(query => classDefinitionFromQuery(query));

  return join([
    '//  This file was automatically generated and should not be edited.\n\n',
    importDeclarations() + '\n',
    wrap('\n', join(typeDefinitions, '\n\n'), '\n'),
    wrap('\n', join(classDefinitions, '\n\n'), '\n')
  ]);
}

function escapedString(string) {
  return string.replace(/"/g, '\\"');
}

function multilineString(string) {
  const lines = string.split('\n');
  return lines.map((line, index) => {
    const isLastLine = index != lines.length - 1;
    return `"${escapedString(line)}"` + (isLastLine ? ' +' : '');
  }).join('\n');
}

function importDeclarations() {
  return 'import Apollo';
}

function typeDeclarationForGraphQLType(type) {
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

function classDefinitionFromQuery({ source, name, variables, fields }) {
  const className = `${pascalCase(name)}Query`;
  const properties = propertiesFromFields(fields);

  return `public class ${className}: GraphQLQuery ` +
    block([
      wrap('', instancePropertyDeclarations(variables), '\n'),
      initializerDeclaration(variables),
      wrap('\n', operationDefinition(source)),
      wrap('\n', variablesProperty(variables)),
      wrap('\n', structDeclaration({ name: "Data", properties }))]);
}

function instancePropertyDeclarations(variables = []) {
  return join(variables.map(variable => {
    return `public let ${variable.name}: ${typeNameFromGraphQLType(variable.type)}`;
  }), '\n');
}

function initializerDeclaration(variables = []) {
  const initializationParameters = join(variables.map(variable => {
    return `${variable.name}: ${typeNameFromGraphQLType(variable.type)}`;
  }), ', ');

  const propertyInitializations = variables.map(variable => {
    return `self.${variable.name} = ${variable.name}`;
  });

  return `public init(${initializationParameters}) ` + block(propertyInitializations);
}

function variablesProperty(variables = []) {
  if (variables.length < 1) return null;

  const variablesMap = wrap(`return [`, join(variables.map(variable => {
    return `"${variable.name}": ${variable.name}`;
  }), ', '), `]`);

  return 'public var variables: GraphQLMap? ' + block([variablesMap]);
}

function operationDefinition(source) {
  return `public let operationDefinition =
  ${indent(multilineString(source))}`
}

function structDeclaration({ name, properties = [] }) {
  const propertyDeclarations = properties.map(propertyDeclaration);

  const initializerDeclaration = `public init(map: GraphQLMap) throws ` +
    block(properties.map(property =>
      `${property.name} = try map.${ property.isList ? 'list' : 'value' }(forKey: "${property.fieldName}")`));

  const compositeProperties = properties.filter(property => property.isComposite);
  const nestedStructDeclarations = compositeProperties.map(property => wrap('\n', structDeclaration(property.typeDeclaration)) );

  return `public struct ${name}: GraphQLMapConvertible ` +
    block([
      wrap('', join(propertyDeclarations, '\n'), '\n'),
      initializerDeclaration,
      join(nestedStructDeclarations, '\n')
    ]);
}

function propertyDeclaration({ name, typeName }) {
  return `public let ${name}: ${typeName}`;
}
