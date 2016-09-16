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

import { propertiesFromSelectionSet, typeNameFromGraphQLType } from './mapping'

export function generateSource(schema, document) {
  const typeInfo = new TypeInfo(schema);

  let typesUsed = [];
  let queryDefinitions = [];

  visit(document, visitWithTypeInfo(typeInfo, {
    leave: {
      Name: node => node.value,
      Document: node => node.definitions,
      OperationDefinition: ({ loc, name, operation, variableDefinitions, selectionSet }) => {
        queryDefinitions.push({ name, operation, source: sourceAt(loc), variableDefinitions, selectionSet });
      },
      VariableDefinition: node => {
        const type = typeInfo.getInputType();
        typesUsed.push(type);
        return { name: node.variable, type: type };
      },
      Variable: node => node.name,
      SelectionSet: ({ selections }) => selections,
      Field: ({ kind, alias, name, arguments: args, directives, selectionSet }) => {
        const type = typeInfo.getType();
        typesUsed.push(type);
        return { kind, alias, name, type: type, selectionSet: selectionSet ? selectionSet : undefined }
      }
    }
  }));

  const typeDefinitions = typesUsed.map(type => typeDeclarationForGraphQLType(type));
  const classDefinitions = queryDefinitions.map(query => classDefinitionFromQuery(query));

  return join([
    '//  This file was automatically generated and should not be edited.\n\n',
    importDeclarations() + '\n',
    wrap('\n', join(typeDefinitions, '\n\n'), '\n'),
    wrap('\n', join(classDefinitions, '\n\n'), '\n')
  ]);
}

function sourceAt(location) {
  return location.source.body.slice(location.start, location.end);
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

function classDefinitionFromQuery({ source, name, variableDefinitions, selectionSet }) {
  const className = `${pascalCase(name)}Query`;
  const properties = propertiesFromSelectionSet(selectionSet);

  return `public class ${className}: GraphQLQuery ` +
    block([
      wrap('', instancePropertyDeclarations(variableDefinitions), '\n'),
      initializerDeclaration(variableDefinitions),
      wrap('\n', operationDefinition(source)),
      wrap('\n', variablesProperty(variableDefinitions)),
      wrap('\n', structDeclaration({ name: "Data", properties }))]);
}

function instancePropertyDeclarations(variableDefinitions = []) {
  return join(variableDefinitions.map(variable => {
    return `public let ${variable.name}: ${typeNameFromGraphQLType(variable.type)}`;
  }), '\n');
}

function initializerDeclaration(variableDefinitions = []) {
  const initializationParameters = join(variableDefinitions.map(variable => {
    return `${variable.name}: ${typeNameFromGraphQLType(variable.type)}`;
  }), ', ');

  const propertyInitializations = variableDefinitions.map(variable => {
    return `self.${variable.name} = ${variable.name}`;
  });

  return `public init(${initializationParameters}) ` + block(propertyInitializations);
}

function variablesProperty(variableDefinitions = []) {
  if (variableDefinitions.length < 1) return null;

  const variablesMap = wrap(`return [`, join(variableDefinitions.map(variable => {
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
