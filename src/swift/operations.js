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
import { propertiesFromFields, typeNameForProperty } from './properties'
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

  const path = [className];
  const protocolsReferenced = [];

  return join([
    `public final class ${className}: GraphQLQuery ` +
    block([
      wrap('', instancePropertyDeclarations, '\n'),
      initializerDeclaration(variables),
      wrap('\n', 'public static let operationDefinition =' + indent('\n' + multilineString(source))),
      wrap('\n', queryDocument),
      wrap('\n', variablesProperty(variables)),
      wrap('\n', structDeclaration({ name: "Data", properties }, path, protocolsReferenced))
    ]),
    ...protocolsReferenced.map(protocolDeclaration),
  ], '\n\n');
}

function protocolDeclaration({ protocolName, properties }) {
  return `public protocol ${protocolName} ` + block(properties.map(property =>
    `var ${property.name}: ${typeNameForProperty(property)} { get }`
  ));
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

function structDeclaration({ name, properties = [], protocolsAdopted }, path, protocolsReferenced) {
  path = path.concat(name);

  const propertyDeclarations = properties.map(property =>
    `public let ${property.name}: ${typeNameForProperty(property)}`
  );

  const initializerDeclaration = `public init(map: GraphQLMap) throws ` +
    block(properties.map(initializationForProperty));

  const compositeProperties = properties.filter(property => property.isComposite);

  return join([`public struct ${name}: GraphQLMapConvertible`,
    wrap(', ', join(protocolsAdopted, ', ')),
    ' ',
    block([
      wrap('', join(propertyDeclarations, '\n'), '\n'),
      initializerDeclaration,
      join(nestedDeclarationsForProperties(compositeProperties, path, protocolsReferenced), '\n')
    ])
  ]);
}

function initializationForProperty({ name, fieldName, unmodifiedTypeName, isOptional, isList, isPolymorphic, subTypes }) {
  const methodName = isOptional ? (isList ? 'optionalList' : 'optionalValue') : (isList ? 'list' : 'value');

  const args = [`forKey: "${fieldName}"`];

  if (isPolymorphic) {
    const possibleTypes = subTypes.map(({ typeCondition }) =>
      `"${String(typeCondition)}": ${polymorphicTypeName(unmodifiedTypeName, typeCondition)}.self`
    );
    args.push(`possibleTypes: [${ join(possibleTypes, ', ') }]`);
  }

  return `${name} = try map.${methodName}(${ join(args, ', ') })`;
}

function nestedDeclarationsForProperties(properties, path, protocolsReferenced) {
  return properties.reduce((declarations, property) =>
    nestedDeclarationsForProperty(property, path, declarations, protocolsReferenced)
  , []);
}

function nestedDeclarationsForProperty(property, path, declarations, protocolsReferenced) {
  const { unmodifiedTypeName: name, properties, fragmentSpreads, isPolymorphic, subTypes } = property;

  const protocolsAdopted = protocolsAdoptedForFragmentSpreads(fragmentSpreads);

  if (isPolymorphic) {
    const baseProtocol = {
      protocolName: mangledProtocolName(name, path),
      properties: properties.map(property => {
        if (property.isComposite) {
          return { ...property, unmodifiedTypeName: qualifiedTypeName(property.unmodifiedTypeName, path.concat(name)) }
        } else {
          return property;
        }
      })
    };

    protocolsReferenced.push(baseProtocol);
    protocolsAdopted.unshift(name);
    declarations.push(`\npublic typealias ${name} = ${baseProtocol.protocolName}`);

    declarations.push(wrap('\n', structDeclaration({ name: polymorphicTypeName(name), properties, protocolsAdopted }, path, protocolsReferenced)));

    for (const subType of subTypes) {
      const { typeCondition, properties, fragmentSpreads } = subType;
      const protocolsAdopted = [name, ...protocolsAdoptedForFragmentSpreads(fragmentSpreads)];

      declarations.push(wrap('\n',
        structDeclaration({ name: polymorphicTypeName(name, typeCondition), properties, protocolsAdopted }, path, protocolsReferenced)
      ));
    }
  } else {
    declarations.push(wrap('\n', structDeclaration({ name, properties, protocolsAdopted }, path, protocolsReferenced)));
  }

  return declarations;
}

function polymorphicTypeName(name, typeCondition) {
  if (typeCondition) {
    return name + '$' + String(typeCondition);
  } else {
    return name + '$Base';
  }
}

function protocolsAdoptedForFragmentSpreads(fragmentSpreads) {
  if (!fragmentSpreads) return [];
  return fragmentSpreads.map(protocolNameForFragmentName);
}

function mangledProtocolName(protocolName, path) {
  return [...path, protocolName].join('_');
}

function qualifiedTypeName(typeName, path) {
  return [...path, typeName].join('.');
}
