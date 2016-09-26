import {
  visit,
  visitWithTypeInfo,
  TypeInfo,
} from 'graphql';

import { camelCase, pascalCase } from 'change-case';

import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing';

import { escapedString, multilineString } from './strings'
import { typeNameFromGraphQLType, typeDeclarationForGraphQLType } from './types';
import { propertiesFromFields } from './properties'
import { protocolNameForFragmentName } from './fragments'

export function classDeclarationForOperation({ operationName, variables, fields, source, fragmentsReferenced }) {
  const className = `${pascalCase(operationName)}Query`;
  const properties = propertiesFromFields(fields);

  const instancePropertyDeclarations = join(variables.map(variable =>
    `public let ${variable.name}: ${typeNameFromGraphQLType(variable.type)}`
  ), '\n');

  let queryDocument;
  if (fragmentsReferenced && fragmentsReferenced.length > 0) {
    queryDocument = 'public static let queryDocument = ' + join(['operationDefinition', ...fragmentsReferenced.map(fragment =>
      `.appending(${protocolNameForFragmentName(fragment)}Fragment.fragmentDefinition)`
    )])
  }

  return `public final class ${className}: GraphQLQuery ` +
    block([
      wrap('', instancePropertyDeclarations, '\n'),
      initializerDeclaration(variables),
      wrap('\n', 'public static let operationDefinition =' + indent('\n' + multilineString(source))),
      wrap('\n', queryDocument),
      wrap('\n', variablesProperty(variables)),
      wrap('\n', structDeclaration({ name: "Data", properties }))
    ]);
}

function initializerDeclaration(variables) {
  const initializationParameters = join(variables.map(variable =>
    `${variable.name}: ${typeNameFromGraphQLType(variable.type)}`
  ), ', ');

  const propertyInitializations = variables.map(variable =>
    `self.${variable.name} = ${variable.name}`
  );

  return `public init(${initializationParameters}) ` + block(propertyInitializations);
}

function variablesProperty(variables) {
  if (variables.length < 1) return null;

  const variablesMap = wrap(`return [`, join(variables.map(variable => {
    return `"${variable.name}": ${variable.name}`;
  }), ', '), `]`);

  return 'public var variables: GraphQLMap? ' + block([variablesMap])
}

function structDeclaration({ name, properties = [], fragmentSpreads }) {
  const propertyDeclarations = properties.map(({ name, typeName }) =>
    `public let ${name}: ${typeName}`
  );

  const initializerDeclaration = `public init(map: GraphQLMap) throws ` +
    block(properties.map(property =>
      `${property.name} = try map.${ property.isList ? 'list' : 'value' }(forKey: "${property.fieldName}")`));

  const compositeProperties = properties.filter(property => property.isComposite);

  return join([`public struct ${name}: GraphQLMapConvertible`,
    wrap(', ', join(fragmentSpreads && fragmentSpreads.map(protocolNameForFragmentName), ', ')),
    ' ',
    block([
      wrap('', join(propertyDeclarations, '\n'), '\n'),
      initializerDeclaration,
      join(nestedStructDeclarations(compositeProperties), '\n')
    ])
  ]);
}

function nestedStructDeclarations(properties) {
  let declarations = [];

  for (const property of properties) {
    const { unmodifiedTypeName: name, properties, fragmentSpreads, inlineFragments } = property;

    declarations.push(wrap('\n', structDeclaration({ name, properties, fragmentSpreads })));

    for (const inlineFragment of inlineFragments) {
      const { typeCondition, properties, fragmentSpreads } = inlineFragment;

      declarations.push(wrap('\n',
        structDeclaration({ name: `${name}_${String(typeCondition)}`, properties, fragmentSpreads })
      ));
    }
  }

  return declarations;
}
