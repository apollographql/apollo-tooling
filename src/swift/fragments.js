import { camelCase, pascalCase } from 'change-case';
import Inflector from 'inflected'

import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing';

import {
  classDeclaration,
  protocolDeclaration,
  protocolPropertyDeclaration,
  protocolPropertyDeclarations
} from './declarations';

import { typeNameFromGraphQLType } from './types';
import { multilineString } from './strings'
import { propertiesFromFields } from './properties'

export function classDeclarationForFragment(generator,
    { fragmentName, source = '' }) {
  const className = `${pascalCase(fragmentName)}Fragment`;

  classDeclaration(generator, {
    name: className,
    modifiers: ['public', 'final'],
    adoptedProtocols: ['GraphQLFragment']
  }, () => {
    generator.printOnNewline('public static let fragmentDefinition =');
    generator.withIndent(() => {
      multilineString(generator, source);
    });

    const protocolName = protocolNameForFragmentName(fragmentName);
    generator.printNewlineIfNeeded();
    generator.printOnNewline(`public typealias Data = ${protocolName}`);
  });
}

export function protocolDeclarationForFragment(generator, { fragmentName, fields }) {
  const protocolName = protocolNameForFragmentName(fragmentName);
  protocolDeclarationForSubselection(generator, { protocolName, fields });
}

export function protocolDeclarationForSubselection(generator,
    { protocolName, fragmentSpreads, fields }, path = []) {
  const adoptedProtocols = fragmentSpreads && fragmentSpreads.map(protocolNameForFragmentName);

  path.push(protocolName);

  const subselections = [];

  fields.forEach(field => {
    if (field.fields) {
      field.protocolName = mangledTypeName(pascalCase(Inflector.singularize(field.name)), path);
      field.typeName = typeNameFromGraphQLType(field.type, field.protocolName);
      subselections.push(field);
    } else {
      field.typeName = typeNameFromGraphQLType(field.type);
    }
  });

  protocolDeclaration(generator, { name: protocolName, adoptedProtocols }, () => {
    protocolPropertyDeclarations(generator, fields);
  });

  subselections.forEach(subselection => {
    protocolDeclarationForSubselection(generator, subselection, path);
  });
}

function mangledTypeName(typeName, path) {
  if (!path) return typeName;
  return join([...path, typeName], '_');
}

export function protocolNameForFragmentName(fragmentName) {
  return pascalCase(fragmentName);
}
