import {
  join,
  wrap,
} from '../utilities/printing';

export function interfaceDeclaration(generator, { interfaceName, extendTypes }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export interface ${ interfaceName }`);
  if (extendTypes && extendTypes.length > 0) {
    generator.print(` extends ${extendTypes.join(', ')}`);
  }
  generator.pushScope({ typeName: interfaceName });
  generator.withinBlock(closure);
  generator.popScope();
}

export function propertyDeclaration(generator, { propertyName, typeName, description, isArray, isNullable, inInterface, fragmentSpreads }, closure) {
  generator.printOnNewline(description && `// ${description}`);
  if (closure) {
    generator.printOnNewline(`${propertyName}:`);
    if (isArray) {
      generator.print(' Array<');
    }
    if (fragmentSpreads && fragmentSpreads.length > 0) {
      generator.print(` ${fragmentSpreads.map(n => `${n}Fragment`).join(' & ')} &`);
    }
    generator.pushScope({ typeName: propertyName });
    generator.withinBlock(closure);
    generator.popScope();
    if (isArray) {
      generator.print(' >');
    }
    if (isNullable) {
      generator.print(' | null');
    }
  } else if (fragmentSpreads && fragmentSpreads.length > 0) {
    generator.printOnNewline(`${propertyName}: ${fragmentSpreads.map(n => `${n}Fragment`).join(' & ')}`);
  } else {
    generator.printOnNewline(`${propertyName}: ${typeName}`);
  }
  generator.print(inInterface ? ';' : ',');
}

export function propertyDeclarations(generator, properties) {
  if (!properties) return;
  properties.forEach(property => propertyDeclaration(generator, property));
}
