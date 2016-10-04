import { camelCase, pascalCase } from 'change-case';

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
  const className = `${protocolName}Fragment`;

  protocolDeclaration(generator, { name: 'HeroDetails' }, () => {
    const properties = propertiesFromFields(fields);
    protocolPropertyDeclarations(generator, properties);
  });
}

export function protocolNameForFragmentName(fragmentName) {
  return pascalCase(fragmentName);
}
