import {
  join,
  wrap,
} from '../utilities/printing';

import { propertyDeclarations } from './codeGeneration';

import { pascalCase } from 'change-case';

export function typeDeclaration(generator, { interfaceName }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export type ${ interfaceName } =`);
  generator.pushScope({ typeName: interfaceName });
  generator.withinBlock(closure, ' {|', '|}');
  generator.popScope();
  generator.print(';');
}

export function propertyDeclaration(generator, { propertyName, typeName, description, isArray, isNullable, inInterface, fragmentSpreads }, closure, open = ' {|', close = '|}') {
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
      closure();
    }, open, close);


    generator.popScope();

    if (isArray) {
      generator.print(' >');
    }

  }
  /*
  else if (fragmentSpreads && fragmentSpreads.length === 1) {
    generator.printOnNewline(`${propertyName}: ${isArray ? 'Array<' : ''}${pascalCase(fragmentSpreads[0])}Fragment${isArray ? '>' : ''}`);
  } else if (fragmentSpreads && fragmentSpreads.length > 1) {
    generator.printOnNewline(`${propertyName}: ${isArray ? 'Array<' : ''}`);

    generator.withinBlock(() => {
      fragmentSpreads.forEach(n => generator.printOnNewline(`...${pascalCase(n)}Fragment,`));
    }, '{|', '|}');

    generator.print(isArray ? '>' : '');
  }
  */
  
  else {
    generator.printOnNewline(`${propertyName}: ${typeName}`);
  }
  generator.print(',');
}

export function propertySetsDeclaration(generator, property, propertySets) {
  const { description, propertyName, typeName, isNullable, isArray } = property;

  generator.printOnNewline(description && `// ${description}`);
  // if (closure) {
  //   generator.printOnNewline(`${propertyName}:`);
  //   if (isNullable) {
  //     generator.print(' ?');
  //   }
  //   if (isArray) {
  //     if (!isNullable) {
  //       generator.print(' ');
  //     }
  //     generator.print('Array<');
  //   }

  //   generator.pushScope({ typeName: propertyName });

  //   generator.withinBlock(() => {
  //     closure();
  //   }, open, close);


  //   generator.popScope();

  //   if (isArray) {
  //     generator.print(' >');
  //   }

  // } else {
  // generator.printOnNewline(`${propertyName}: ${typeName}`);
  // }
  generator.printOnNewline(`${propertyName}:`);

  if (isNullable) {
    generator.print(' ?');
  }

  if (isArray) {
    generator.print('Array< ');
  }

  generator.pushScope({ typeName: propertyName });

  generator.withinBlock(() => {
    propertySets.forEach((propertySet, index, propertySets) => {
      // generator.printOnNewline(`${propertyName}: ${typeName}`);
      generator.withinBlock(() => {
        propertyDeclarations(generator, propertySet);
      });
      if (index !== propertySets.length - 1) {
        generator.print(' |')
      }
    })
  }, ' (', ')');

  generator.popScope();

  if (isArray) {
    generator.print(' >');
  }

  generator.print(',');
}
