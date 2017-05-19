import {
  join,
  wrap,
} from '../utilities/printing';

export function namespaceDeclaration(generator, namespace, closure) {
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

export function classDeclaration(generator, { className, modifiers, superClass, adoptedProtocols = [], properties }, closure) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(wrap('', join(modifiers, ' '), ' ') + `class ${className}`);
  generator.print(wrap(': ', join([superClass, ...adoptedProtocols], ', ')));
  generator.pushScope({ typeName: className });
  generator.withinBlock(closure);
  generator.popScope();
}

export function structDeclaration(generator, { structName, description, adoptedProtocols = [] }, closure) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(description && `/// ${description}`);
  generator.printOnNewline(`public struct ${structName}`);
  generator.print(wrap(': ', join(adoptedProtocols, ', ')));
  generator.pushScope({ typeName: structName });
  generator.withinBlock(closure);
  generator.popScope();
}

export function propertyDeclaration(generator, { propertyName, typeName, description }) {
  generator.printOnNewline(description && ` /// ${description}`);
  generator.printOnNewline(`public var ${propertyName}: ${typeName}`);
}

export function propertyDeclarations(generator, properties) {
  if (!properties) return;
  properties.forEach(property => propertyDeclaration(generator, property));
}

export function protocolDeclaration(generator, { protocolName, adoptedProtocols, properties }, closure) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(`public protocol ${protocolName}`);
  generator.print(wrap(': ', join(adoptedProtocols, ', ')));
  generator.pushScope({ typeName: protocolName });
  generator.withinBlock(closure);
  generator.popScope();
}

export function protocolPropertyDeclaration(generator, { propertyName, typeName }) {
  generator.printOnNewline(`var ${propertyName}: ${typeName} { get }`);
}

export function protocolPropertyDeclarations(generator, properties) {
  if (!properties) return;
  properties.forEach(property => protocolPropertyDeclaration(generator, property));
}

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

export function escapeIdentifierIfNeeded(identifier) {
  if (reservedKeywords.has(identifier)) {
    return '`' + identifier + '`';
  } else {
    return identifier;
  }
}
