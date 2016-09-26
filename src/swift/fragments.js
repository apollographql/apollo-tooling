import { camelCase, pascalCase } from 'change-case';

import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing';

import { multilineString } from './strings'
import { propertiesFromFields } from './properties'

export function classDeclarationForFragment({ fragmentName, fields, source }) {
  const protocolName = protocolNameForFragmentName(fragmentName);
  const className = `${protocolName}Fragment`;
  const properties = propertiesFromFields(fields);

  return join([
    `public final class ${className}: GraphQLFragment `,
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

export function protocolNameForFragmentName(fragmentName) {
  return pascalCase(fragmentName);
}
