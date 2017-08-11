import CodeGenerator from '../utilities/CodeGenerator';

import { join, wrap } from '../utilities/printing';

export function comment(generator: CodeGenerator, comment: string | undefined) {
  comment &&
    comment.split('\n').forEach(line => {
      generator.printOnNewline(`/// ${line.trim()}`);
    });
}

export function deprecation(generator: CodeGenerator, isDeprecated: boolean | undefined, deprecationReason: string | undefined) {
  if (isDeprecated !== undefined && isDeprecated) {
    deprecationReason = (deprecationReason !== undefined && deprecationReason.length > 0) ? deprecationReason : ""
    generator.printOnNewline(`@available(*, deprecated, message: "${deprecationReason}")`)
  }
}

export function namespaceDeclaration(
  generator: CodeGenerator,
  namespace: string | undefined,
  closure: Function
) {
  if (namespace) {
    generator.printNewlineIfNeeded();
    generator.printOnNewline(`/// ${namespace} namespace`);
    generator.printOnNewline(`public enum ${namespace}`);
    generator.pushScope({ typeName: namespace });
    generator.withinBlock(closure);
    generator.popScope();
  } else {
    closure();
  }
}

export interface Class {
  className: string;
  modifiers: string[];
  superClass?: string;
  adoptedProtocols: string[];
}

export function classDeclaration(
  generator: CodeGenerator,
  { className, modifiers, superClass, adoptedProtocols = [] }: Class,
  closure: Function
) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(wrap('', join(modifiers, ' '), ' ') + `class ${className}`);
  generator.print(wrap(': ', join([superClass, ...adoptedProtocols], ', ')));
  generator.pushScope({ typeName: className });
  generator.withinBlock(closure);
  generator.popScope();
}

export interface Struct {
  structName: string;
  description?: string;
  adoptedProtocols?: string[];
}

export function structDeclaration(
  generator: CodeGenerator,
  { structName, description, adoptedProtocols = [] }: Struct,
  closure: Function
) {
  generator.printNewlineIfNeeded();
  comment(generator, description);
  generator.printOnNewline(`public struct ${structName}`);
  generator.print(wrap(': ', join(adoptedProtocols, ', ')));
  generator.pushScope({ typeName: structName });
  generator.withinBlock(closure);
  generator.popScope();
}

export interface Property {
  propertyName: string;
  typeName: string;
  isOptional?: boolean;
  description?: string;
}

export function propertyDeclaration(
  generator: CodeGenerator,
  { propertyName, typeName, description }: Property
) {
  comment(generator, description);
  generator.printOnNewline(`public var ${propertyName}: ${typeName}`);
}

export function propertyDeclarations(generator: CodeGenerator, properties: Property[]) {
  if (!properties) return;
  properties.forEach(property => propertyDeclaration(generator, property));
}

export interface Protocol {
  protocolName: string;
  adoptedProtocols: string[];
  properties: Property[];
}

export function protocolDeclaration(
  generator: CodeGenerator,
  { protocolName, adoptedProtocols, properties }: Protocol,
  closure: Function
) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(`public protocol ${protocolName}`);
  generator.print(wrap(': ', join(adoptedProtocols, ', ')));
  generator.pushScope({ typeName: protocolName });
  generator.withinBlock(closure);
  generator.popScope();
}

export function protocolPropertyDeclaration(generator: CodeGenerator, { propertyName, typeName }: Property) {
  generator.printOnNewline(`var ${propertyName}: ${typeName} { get }`);
}

export function protocolPropertyDeclarations(generator: CodeGenerator, properties: Property[]) {
  if (!properties) return;
  properties.forEach(property => protocolPropertyDeclaration(generator, property));
}

// prettier-ignore
const reservedKeywords = new Set(['associatedtype', 'class', 'deinit', 'enum', 'extension',
  'fileprivate', 'func', 'import', 'init', 'inout', 'internal', 'let', 'open',
  'operator', 'private', 'protocol', 'public', 'static', 'struct', 'subscript',
  'typealias', 'var', 'break', 'case', 'continue', 'default', 'defer', 'do',
  'else', 'fallthrough', 'for', 'guard', 'if', 'in', 'repeat', 'return',
  'switch', 'where', 'while', 'as', 'Any', 'catch', 'false', 'is', 'nil',
  'rethrows', 'super', 'self', 'Self', 'throw', 'throws', 'true', 'try',
  'associativity', 'convenience', 'dynamic', 'didSet', 'final', 'get', 'infix',
  'indirect', 'lazy', 'left', 'mutating', 'none', 'nonmutating', 'optional',
  'override', 'postfix', 'precedence', 'prefix', 'Protocol', 'required', 'right',
  'set', 'Type', 'unowned', 'weak', 'willSet']);

export function escapeIdentifierIfNeeded(identifier: string) {
  if (reservedKeywords.has(identifier)) {
    return '`' + identifier + '`';
  } else {
    return identifier;
  }
}
