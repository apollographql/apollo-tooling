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

export function generateSource({ typesUsed, queries, fragments }) {
  const typeDefinitions = typesUsed.map(typeDeclarationForGraphQLType);
  const queryClassDefinitions = queries.map(classDefinitionForQuery);
  const fragmentClassDefinitions = fragments.map(classDefinitionForFragment);

  return join([
    '//  This file was automatically generated and should not be edited.\n\n',
    importDeclarations() + '\n',
    wrap('\n', join(typeDefinitions, '\n\n'), '\n'),
    wrap('\n', join(queryClassDefinitions, '\n\n'), '\n'),
    wrap('\n', join(fragmentClassDefinitions, '\n\n'), '\n')
  ]);
}

function importDeclarations() {
  return 'import Apollo';
}

function classDefinitionForQuery({ operationName, variables, fields, source, fragmentsUsed }) {
  const className = `${pascalCase(operationName)}Query`;
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

  let queryDocument;
  if (fragmentsUsed && fragmentsUsed.length > 0) {
    queryDocument = 'public var queryDocument: String ' +
      block([
        join(['return operationDefinition', ...fragmentsUsed.map(fragment =>
          `.appending(${protocolNameForFragmentName(fragment)}Fragment.fragmentDefinition)`
        )])
      ]);
  }

  return `public class ${className}: GraphQLQuery ` +
    block([
      wrap('', instancePropertyDeclarations, '\n'),
      initializerDeclaration,
      wrap('\n', 'public let operationDefinition =' + indent('\n' + multilineString(source))),
      wrap('\n', queryDocument),
      wrap('\n', variablesProperty),
      wrap('\n', structDeclaration({ name: "Data", properties }))
    ]);
}

function structDeclaration({ name, properties = [], fragmentsUsed }) {
  const propertyDeclarations = properties.map(({ name, typeName }) =>
    `public let ${name}: ${typeName}`
  );

  const initializerDeclaration = `public init(map: GraphQLMap) throws ` +
    block(properties.map(property =>
      `${property.name} = try map.${ property.isList ? 'list' : 'value' }(forKey: "${property.fieldName}")`));

  const compositeProperties = properties.filter(property => property.isComposite);
  const nestedStructDeclarations = compositeProperties.map(property =>
    wrap('\n', structDeclaration({
      name: property.unmodifiedTypeName,
      properties: property.subproperties,
      fragmentNames: property.fragmentNames
    })
  ));

  return join([`public struct ${name}: GraphQLMapConvertible`,
    wrap(', ', join(fragmentsUsed && fragmentsUsed.map(protocolNameForFragmentName), ', ')),
    ' ',
    block([
      wrap('', join(propertyDeclarations, '\n'), '\n'),
      initializerDeclaration,
      join(nestedStructDeclarations, '\n')
    ])
  ]);
}

function protocolNameForFragmentName(fragmentName) {
  return pascalCase(fragmentName);
}

function classDefinitionForFragment({ name, fields, source }) {
  const protocolName = protocolNameForFragmentName(name);
  const className = `${protocolName}Fragment`;
  const properties = propertiesFromFields(fields);

  return join([
    `public class ${className}: GraphQLFragment `,
    block([
      'public static let fragmentDefinition =' + indent('\n' + multilineString(source) + '\n'),
      `public typealias Data = ${protocolName}`
    ]),
    '\n\n',
    `public protocol ${protocolName} `,
    block(properties.map(({ name, typeName }) =>
      `var ${name}: ${typeName} { get }`
    ))
  ]);
}
