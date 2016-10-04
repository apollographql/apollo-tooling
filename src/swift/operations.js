import {
  GraphQLNonNull
} from 'graphql'

import { camelCase, pascalCase } from 'change-case';

import {
  join,
  wrap,
} from '../utilities/printing';

import {
  classDeclaration,
  structDeclaration,
  propertyDeclaration,
  propertyDeclarations
} from './declarations';

import { escapedString, multilineString } from './strings';

import {
  typeNameFromGraphQLType,
  typeDeclarationForGraphQLType
} from './types';

import {
  propertyFromField,
  propertiesFromFields
} from './properties';

import { protocolNameForFragmentName } from './fragments';

export function classDeclarationForOperation(generator,
    { operationName, variables = [], fields = [], source = '', fragmentsReferenced }) {
  const className = `${pascalCase(operationName)}Query`;

  classDeclaration(generator, {
    name: className,
    modifiers: ['public', 'final'],
    adoptedProtocols: ['GraphQLQuery']
  }, () => {
    generator.printOnNewline('public static let operationDefinition =');
    generator.withIndent(() => {
      multilineString(generator, source);
    });

    if (fragmentsReferenced && fragmentsReferenced.length > 0) {
      generator.printOnNewline('public static let queryDocument = operationDefinition');
      generator.print(fragmentsReferenced.map(fragment =>
        `.appending(${protocolNameForFragmentName(fragment)}Fragment.fragmentDefinition)`
      ));
    }

    if (variables && variables.length > 0) {
      generator.printNewlineIfNeeded();
      propertyDeclarations(generator, propertiesFromFields(variables));
      generator.printNewlineIfNeeded();
      initializerDeclarationForVariables(generator, variables);
      generator.printNewlineIfNeeded();
      variablesProperty(generator, variables);
    }

    const properties = propertiesFromFields(fields);
    structDeclarationForProperty(generator, { bareTypeName: "Data", properties });
  });
}

export function initializerDeclarationForVariables(generator, variables) {
  generator.printOnNewline(`public init`);

  generator.print('(');
  generator.print(join(variables.map(({ name, type }) =>
    join([
      `${name}: ${typeNameFromGraphQLType(type)}`,
      !(type instanceof GraphQLNonNull) && ' = nil'
    ])
  ), ', '));
  generator.print(')');

  generator.withinBlock(() => {
    variables.forEach(({ name }) => {
      generator.printOnNewline(`self.${name} = ${name}`);
    });
  });
}

export function variablesProperty(generator, variables) {
  generator.printOnNewline('public var variables: GraphQLMap?');
  generator.withinBlock(() => {
    generator.printOnNewline(wrap(
      `return [`,
      join(variables.map(({ name }) => `"${name}": ${name}`), ', '),
      `]`
    ));
  });
}

export function structDeclarationForProperty(generator,
    { bareTypeName, fragmentSpreads = [], properties = [] }) {
  const adoptedProtocols = ['GraphQLMapConvertible', ...fragmentSpreads.map(protocolNameForFragmentName)];

  structDeclaration(generator, { name: bareTypeName, adoptedProtocols }, () => {
    propertyDeclarations(generator, properties);

    generator.printNewlineIfNeeded();
    generator.printOnNewline('public init(map: GraphQLMap) throws');
    generator.withinBlock(() => {
      properties.forEach(property => initializationForProperty(generator, property));
    });

    properties.filter(property => property.isComposite).forEach(property => {
      structDeclarationForProperty(generator, property);
    });
  });
}

export function initializationForProperty(generator, { name, fieldName, isOptional, isList }) {
  const methodName = isOptional ? (isList ? 'optionalList' : 'optionalValue') : (isList ? 'list' : 'value');

  const args = [`forKey: "${fieldName}"`];

  generator.printOnNewline(`${name} = try map.${methodName}(${ join(args, ', ') })`);
}
