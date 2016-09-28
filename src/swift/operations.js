import {
  visit,
  visitWithTypeInfo,
  TypeInfo,
  GraphQLNonNull
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
  const initializationParameters = join(variables.map(variable => {
    const isNonNullType = variable.type instanceof GraphQLNonNull;
    return join([`${variable.name}: ${typeNameFromGraphQLType(variable.type)}`, !isNonNullType && ' = nil'])
  }), ', ');

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
  const structName = polymorphicTypeName(typeName, discriminator);
  const qualifiedStructName = qualifiedTypeName(structName, stack.path);

  stack.push(typeName, discriminator);

  const compositeProperties = properties.filter(property => property.isComposite);

  for (const property of compositeProperties) {
    addDeclarationsForCompositeProperty(property, stack);
  }

  if (discriminator && compositeProperties && compositeProperties.length > 0) {
    stack.topLevel.declarations.push(join([
      `public extension ${qualifiedStructName} `,
      block(compositeProperties.map(property => {
        const propertyTypeName = typeNameFromGraphQLType(property.fieldType, qualifiedTypeName(property.unmodifiedTypeName, stack.path));
        return `var ${property.name}: ${propertyTypeName} ` + block([
          `return _${property.name}`
        ]);
      }))
    ]));

    properties = properties.map(
      property => property.isComposite ? { ...property, name: '_' + property.name } : property
    );
  }

  const propertyDeclarations = properties.map(property => {
    const propertyName = property.name;
    const propertyTypeName = typeNameForProperty(property);
    const propertySuperTypeName = typeNameFromGraphQLType(property.fieldType, mangledTypeName(property.unmodifiedTypeName, stack.pathWithoutLastDiscriminator));

    if (propertyName.startsWith('_')) {
      return `fileprivate let ${propertyName}: ${propertyTypeName}\n`
        + `fileprivate var _${propertyName}: ${propertySuperTypeName} { return ${propertyName} }`;
    } else {
      return `public let ${propertyName}: ${propertyTypeName}`;
    }
  });

  const initializerDeclaration = `public init(map: GraphQLMap) throws ` +
    block(properties.map(initializationForProperty));

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
    const adoptedProtocolName = stack.isNestedInPolymorphicType ? [mangledTypeName(typeName, stack.pathWithoutLastDiscriminator)] : null;

    const mangledProtocolName = addProtocolDeclaration({
      protocolName: typeName,
      properties: properties.filter(property => !property.isComposite),
      protocolsAdopted: [adoptedProtocolName, ...protocolsAdoptedForFragmentSpreads(fragmentSpreads)]
    }, stack);

    stack.topLevel.declarations.push(join([
      `public extension ${mangledProtocolName} `,
      block(subTypes.map(subType => {
        const asTypeName = qualifiedTypeName(polymorphicTypeName(typeName, subType.typeName), stack.path);
        return `var is${subType.typeName}: Bool { return self is ${asTypeName} }\n` +
          `var as${subType.typeName}: ${asTypeName}? { return self as? ${asTypeName} }`;
        }))
    ]));

    stack.currentLevel.declarations.push(`public typealias ${typeName} = ${mangledProtocolName}`);

    const compositeProperties = properties.filter(property => property.isComposite);

    let mangledPrivateProtocolName;
    if (compositeProperties && compositeProperties.length > 0) {
      mangledPrivateProtocolName = addProtocolDeclaration({
        accessLevel: 'fileprivate',
        protocolName: typeName,
        properties: properties.filter(property => property.isComposite).map(property =>
          ({ ...property, name: '__' + property.name })
        ),
        protocolsAdopted: []
      }, stack);

      stack.topLevel.declarations.push(join([
        `extension ${mangledProtocolName} `,
        block(compositeProperties.map(property => {
          const asTypeName =  typeNameFromGraphQLType(property.fieldType, mangledTypeName(property.unmodifiedTypeName, stack.path.concat(typeName)));
          return `var ${property.name}: ${asTypeName} { return (self as! ${mangledPrivateProtocolName}).__${property.name} }`
          }))
      ]));
    }

    const protocolsAdopted = [typeName, mangledPrivateProtocolName];

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

function addProtocolDeclaration({ accessLevel = 'public', protocolName, properties, protocolsAdopted }, stack) {
  const mangledProtocolName = mangledTypeName(protocolName, stack.path, accessLevel);
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
    `${accessLevel} protocol ${mangledProtocolName}`,
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
    const baseTypeName = polymorphicTypeName(unmodifiedTypeName, 'Base');
    const subTypeNameMap = subTypes.map(({ typeName: subTypeName }) =>
      `"${subTypeName}": ${polymorphicTypeName(unmodifiedTypeName, subTypeName)}.self`
    );
    args.push(`baseType: ${baseTypeName}.self, subTypes: [${ join(subTypeNameMap, ', ') }]`);
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

function mangledTypeName(typeName, path, accessLevel) {
  return join([accessLevel === 'fileprivate' && '_', ...path, typeName], '_');
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
