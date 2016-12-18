import {
  join,
  wrap,
} from '../utilities/printing';

export function typeDeclaration(generator, { interfaceName }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export type ${ interfaceName } =`);
  generator.pushScope({ typeName: interfaceName });
  generator.withinBlock(closure);
  generator.popScope();
  generator.print(';');
}

export function propertyDeclaration(generator, { propertyName, typeName, description, isArray, isNullable, inInterface, fragmentSpreads }, closure) {
  generator.printOnNewline(description && `// ${description}`);
  if (closure) {
    generator.printOnNewline(`${propertyName}:`);
    if (isNullable) {
      generator.print(' ?');
    }
    if (isArray) {
      if (!isNullable) {
        generator.print(' ');
      }
      generator.print('Array<');
    }
    if (fragmentSpreads && fragmentSpreads.length > 0) {
      if (!isNullable) {
        generator.print(' ');
      } else {
        generator.print('(');
      }
      generator.print(`${fragmentSpreads.map(n => `${n}Fragment`).join(' & ')} &`);
    }
    generator.pushScope({ typeName: propertyName });
    generator.withinBlock(closure);
    generator.popScope();
    if (isNullable && fragmentSpreads && fragmentSpreads.length > 0) {
      generator.print(')');
    }
    if (isArray) {
      generator.print(' >');
    }
  } else if (fragmentSpreads && fragmentSpreads.length > 0) {
    generator.printOnNewline(`${propertyName}: ${isArray ? 'Array<' : ''}${fragmentSpreads.map(n => `${n}Fragment`).join(' & ')}${isArray ? '>' : ''}`);
  } else {
    generator.printOnNewline(`${propertyName}: ${typeName}`);
  }
  generator.print(',');
}

export function propertyDeclarations(generator, properties) {
  if (!properties) return;
  properties.forEach(property => propertyDeclaration(generator, property));
}
