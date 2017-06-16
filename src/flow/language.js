import {
  join,
  wrap,
} from '../utilities/printing';

import { pascalCase } from 'change-case';

export function typeDeclaration(generator, { interfaceName, noBrackets }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export type ${ interfaceName } =`);
  generator.pushScope({ typeName: interfaceName });
  if (!noBrackets) {
    generator.withinBlock(closure, ' {|', '|}');
  } else {
    generator.withinBlock(closure, '', '');
  }
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

    generator.pushScope({ typeName: propertyName });

    generator.withinBlock(() => {
      if (fragmentSpreads && fragmentSpreads.length > 0) {
        fragmentSpreads.forEach(n => generator.printOnNewline(`...${pascalCase(n)}Fragment,`));
      }

      closure();
    }, ' {|', '|}');

    generator.popScope();

    if (isArray) {
      generator.print(' >');
    }

  } else if (fragmentSpreads && fragmentSpreads.length === 1) {
    generator.printOnNewline(`${propertyName}: ${isNullable ? '?' : ''}${isArray ? 'Array<' : ''}${pascalCase(fragmentSpreads[0])}Fragment${isArray ? '>' : ''}`);
  } else if (fragmentSpreads && fragmentSpreads.length > 1) {
    generator.printOnNewline(`${propertyName}: ${isNullable ? '?' : ''}${isArray ? 'Array<' : ''}`);

    generator.withinBlock(() => {
      fragmentSpreads.forEach(n => generator.printOnNewline(`...${pascalCase(n)}Fragment,`));
    }, '{|', '|}');

    generator.print(isArray ? '>' : '');
  } else {
    generator.printOnNewline(`${propertyName}: ${typeName}`);
  }
  generator.print(',');
}

export function propertyDeclarations(generator, properties) {
  if (!properties) return;
  properties.forEach(property => propertyDeclaration(generator, property));
}

export function unionDeclaration(generator, typeNames) {
  if (!typeNames) throw new Error('Union Declaration requires types');

  typeNames.forEach(typeName => {
    generator.printOnNewline(`| ${typeName}`);
  });
}
