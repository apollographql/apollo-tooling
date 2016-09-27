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

  const stack = new DeclarationStack();
  stack.push(className);

  return join([
    `public final class ${className}: GraphQLQuery ` +
    block([
      wrap('', instancePropertyDeclarations, '\n'),
      initializerDeclaration(variables),
      wrap('\n', 'public static let operationDefinition =' + indent('\n' + multilineString(source))),
      wrap('\n', queryDocument),
      wrap('\n', variablesProperty(variables)),
      wrap('\n', structDeclaration({ typeName: "Data", properties }, stack))
    ]),
    ...stack.topLevel.declarations,
  ], '\n\n');
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

function structDeclaration({ typeName, discriminator, properties = [], protocolsAdopted }, stack) {
  stack.push(typeName, discriminator);
  const structName = polymorphicTypeName(typeName, discriminator);

  const propertyDeclarations = properties.map(property =>
    `public let ${property.name}: ${typeNameForProperty(property)}`
  );

  const initializerDeclaration = `public init(map: GraphQLMap) throws ` +
    block(properties.map(initializationForProperty));

  const compositeProperties = properties.filter(property => property.isComposite);
  for (const property of compositeProperties) {
    addDeclarationsForCompositeProperty(property, stack);
  }

  return join([
    `public struct ${structName}: GraphQLMapConvertible`,
    wrap(', ', join(protocolsAdopted, ', ')),
    ' ',
    block([
      wrap('', join(propertyDeclarations, '\n'), '\n'),
      initializerDeclaration,
      wrap('\n', join(stack.pop().declarations, '\n\n'))
    ])
  ]);
}

function addDeclarationsForCompositeProperty({ unmodifiedTypeName: typeName, properties, isPolymorphic, subTypes, fragmentSpreads }, stack) {
  if (isPolymorphic) {
    const mangledProtocolName = addProtocolDeclaration({
      protocolName: typeName,
      properties: properties,
      protocolsAdopted: protocolsAdoptedForFragmentSpreads(fragmentSpreads)
    }, stack);
    stack.currentLevel.declarations.push(`public typealias ${typeName} = ${mangledProtocolName}`);

    const protocolsAdopted = [typeName];

    stack.currentLevel.declarations.push(structDeclaration({
      typeName,
      discriminator: 'Base',
      properties,
      protocolsAdopted
    }, stack));

    for (const subType of subTypes) {
      stack.currentLevel.declarations.push(structDeclaration({
        typeName,
        discriminator: subType.typeName,
        properties: subType.properties,
        protocolsAdopted: protocolsAdopted.concat(protocolsAdoptedForFragmentSpreads(subType.fragmentSpreads))
      }, stack));
    }
  } else {
    const mangledProtocolName = stack.isNestedInPolymorphicType ? [mangledTypeName(typeName, stack.pathWithoutLastDiscriminator)] : null;
    const protocolsAdopted = [mangledProtocolName, ...protocolsAdoptedForFragmentSpreads(fragmentSpreads)];

    stack.currentLevel.declarations.push(structDeclaration({
      typeName,
      properties,
      protocolsAdopted,
    }, stack));
  }
}

function addProtocolDeclaration({ protocolName, properties, protocolsAdopted }, stack) {
  const mangledProtocolName = mangledTypeName(protocolName, stack.path);
  stack.push(protocolName);

  const mangledProperties = properties.map(subproperty => {
    if (!subproperty.isComposite) return subproperty;

    const mangledPropertyTypeName = addProtocolDeclaration({
      protocolName: subproperty.unmodifiedTypeName,
      properties: subproperty.properties,
      protocolsAdopted: subproperty.protocolsAdopted
    }, stack);
    return { ...subproperty, unmodifiedTypeName: mangledPropertyTypeName };
  });

  stack.topLevel.declarations.unshift(join([
    `public protocol ${mangledProtocolName}`,
    wrap(': ', join(protocolsAdopted, ', ')),
    ' ',
    block(mangledProperties.map(property =>
      `var ${property.name}: ${typeNameForProperty(property)} { get }`
    ))
  ]));

  stack.pop();

  return mangledProtocolName;
}

function initializationForProperty({ name, fieldName, unmodifiedTypeName, isOptional, isList, isPolymorphic, subTypes }) {
  const methodName = isOptional ? (isList ? 'optionalList' : 'optionalValue') : (isList ? 'list' : 'value');

  const args = [`forKey: "${fieldName}"`];

  if (isPolymorphic) {
    const possibleTypes = subTypes.map(({ typeName: subTypeName }) =>
      `"${subTypeName}": ${polymorphicTypeName(unmodifiedTypeName, subTypeName)}.self`
    );
    args.push(`possibleTypes: [${ join(possibleTypes, ', ') }]`);
  }

  return `${name} = try map.${methodName}(${ join(args, ', ') })`;
}

function polymorphicTypeName(name, discriminator) {
  if (!discriminator) return name;

  return name + '$' + discriminator;
}

function protocolsAdoptedForFragmentSpreads(fragmentSpreads) {
  if (!fragmentSpreads) return [];
  return fragmentSpreads.map(protocolNameForFragmentName);
}

function mangledTypeName(typeName, path) {
  return [...path, typeName].join('_');
}

function qualifiedTypeName(typeName, path) {
  return [...path, typeName].join('.');
}

class DeclarationStack {
  constructor() {
    this.stack = [];
  }

  push(name, discriminator) {
    this.stack.push({ name, discriminator, declarations: [] });
  }

  pop() {
    return this.stack.pop();
  }

  get currentLevel() {
    return this.stack[this.stack.length - 1];
  }

  get topLevel() {
    return this.stack[0];
  }

  get path() {
    return this.stack.map(({ name, discriminator }) => polymorphicTypeName(name, discriminator));
  }

  get pathWithoutLastDiscriminator() {
    return this.stack.slice(0, -1)
      .map(({ name, discriminator }) => polymorphicTypeName(name, discriminator))
      .concat(this.currentLevel.name);
  }

  get isNestedInPolymorphicType() {
    return this.stack.some(({ discriminator }) => discriminator);
  }
}
