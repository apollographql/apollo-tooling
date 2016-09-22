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
} from 'graphql';

import { typeNameFromGraphQLType, typeDeclarationForGraphQLType } from './types';
import { propertiesFromFields } from './properties'
import { escapedString, multilineString } from './strings'

export function generateSource(context) {
  const typeDefinitions = context.getTypesUsed().map(type => typeDeclarationForGraphQLType(type));
  const queryClassDefinitions = context.getQueries().map(query => classDefinitionForQuery(query));

  return join([
    '//  This file was automatically generated and should not be edited.\n\n',
    importDeclarations() + '\n',
    wrap('\n', join(typeDefinitions, '\n\n'), '\n'),
    wrap('\n', join(queryClassDefinitions, '\n\n'), '\n')
  ]);
}

function importDeclarations() {
  return 'import Apollo';
}

function classDefinitionForQuery({ name, variables, fields, source }) {
  const className = `${pascalCase(name)}Query`;
  const properties = propertiesFromFields(fields);

  const instancePropertyDeclarations = join(variables.map(variable =>
    `public let ${variable.name}: ${typeNameFromGraphQLType(variable.type)}`
  ), '\n');

  const initializerDeclaration = (() => {
    const initializationParameters = join(variables.map(variable =>
      `${variable.name}: ${typeNameFromGraphQLType(variable.type)}`
    ), ', ');

    const propertyInitializations = variables.map(variable =>
      `self.${variable.name} = ${variable.name}`
    );

    return `public init(${initializationParameters}) ` + block(propertyInitializations);
  })();

  const variablesProperty = (() => {
    if (variables.length < 1) return null;

    const variablesMap = wrap(`return [`, join(variables.map(variable => {
      return `"${variable.name}": ${variable.name}`;
    }), ', '), `]`);

    return 'public var variables: GraphQLMap? ' + block([variablesMap])
  })();

  return `public class ${className}: GraphQLQuery ` +
    block([
      wrap('', instancePropertyDeclarations, '\n'),
      initializerDeclaration,
      wrap('\n', 'public let operationDefinition =' + indent('\n' + multilineString(source))),
      wrap('\n', variablesProperty),
      wrap('\n', structDeclaration({ name: "Data", properties }))
    ]);
}

function structDeclaration({ name, properties = [] }) {
  const propertyDeclarations = properties.map(({ name, typeName }) =>
    `public let ${name}: ${typeName}`
  );

  const initializerDeclaration = `public init(map: GraphQLMap) throws ` +
    block(properties.map(property =>
      `${property.name} = try map.${ property.isList ? 'list' : 'value' }(forKey: "${property.fieldName}")`));

  const compositeProperties = properties.filter(property => property.isComposite);
  const nestedStructDeclarations = compositeProperties.map(property =>
    wrap('\n', structDeclaration({ name: property.unmodifiedTypeName, properties: property.subproperties }))
  );

  return `public struct ${name}: GraphQLMapConvertible ` +
    block([
      wrap('', join(propertyDeclarations, '\n'), '\n'),
      initializerDeclaration,
      join(nestedStructDeclarations, '\n')
    ]);
}
