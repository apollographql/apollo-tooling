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
  const operations = context.compileOperations();
  const fragments = context.compileFragments();

  const typeDeclarations = context.typesUsed.map(typeDeclarationForGraphQLType);
  const operationClassDeclarations = operations.map(classDeclarationForOperation);
  const fragmentClassDeclarations = fragments.map(classDeclarationForFragment);

  return join([
    '//  This file was automatically generated and should not be edited.\n\n',
    importDeclarations() + '\n',
    wrap('\n', join(typeDeclarations, '\n\n'), '\n'),
    wrap('\n', join(operationClassDeclarations, '\n\n'), '\n'),
    wrap('\n', join(fragmentClassDeclarations, '\n\n'), '\n')
  ]);
}

function importDeclarations() {
  return 'import Apollo';
}

function classDeclarationForOperation({ operationName, variables, fields, source, fragmentsReferenced }) {
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
  if (fragmentsReferenced && fragmentsReferenced.length > 0) {
    queryDocument = 'public var queryDocument: String ' +
      block([
        join(['return operationDefinition', ...fragmentsReferenced.map(fragment =>
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

function structDeclaration({ name, properties = [], fragmentSpreads }) {
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
      properties: property.properties,
      fragmentSpreads: property.fragmentSpreads
    })
  ));

  return join([`public struct ${name}: GraphQLMapConvertible`,
    wrap(', ', join(fragmentSpreads && fragmentSpreads.map(protocolNameForFragmentName), ', ')),
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

function classDeclarationForFragment({ fragmentName, fields, source }) {
  const protocolName = protocolNameForFragmentName(fragmentName);
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
