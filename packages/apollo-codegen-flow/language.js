import {
  join,
  wrap,
} from '../utilities/printing';

import { propertyDeclarations } from './codeGeneration';
import { typeNameFromGraphQLType } from './types';

import { pascalCase } from 'change-case';

export function typeDeclaration(generator, { interfaceName, noBrackets }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export type ${ interfaceName } = `);
  generator.pushScope({ typeName: interfaceName });
  if (noBrackets) {
    generator.withinBlock(closure, '', '');
  } else {
    generator.withinBlock(closure, '{|', '|}');
  }
  generator.popScope();
  generator.print(';');
}

export function propertyDeclaration(generator, {
  fieldName,
  type,
  propertyName,
  typeName,
  description,
  isArray,
  isNullable,
  isArrayElementNullable,
  fragmentSpreads,
  isInput
}, closure, open = ' {|', close = '|}') {
  const name = fieldName || propertyName;

  if (description) {
    description.split('\n')
      .forEach(line => {
        generator.printOnNewline(`// ${line.trim()}`);
      })
  }

  if (closure) {
    generator.printOnNewline(name)
    if (isInput && isNullable) {
      generator.print('?')
    }
    generator.print(':')
    if (isNullable) {
      generator.print(' ?');
    }
    if (isArray) {
      if (!isNullable) {
        generator.print(' ');
      }
      generator.print(' Array<');
      if (isArrayElementNullable) {
        generator.print('?');
      }
    }

    generator.pushScope({ typeName: name });

    generator.withinBlock(closure, open, close);

    generator.popScope();

    if (isArray) {
      generator.print(' >');
    }

  } else {
    generator.printOnNewline(name)
    if (isInput && isNullable) {
      generator.print('?')
    }
    generator.print(`: ${typeName || typeNameFromGraphQLType(generator.context, type)}`);
  }
  generator.print(',');
}

export function propertySetsDeclaration(generator, property, propertySets, standalone = false) {
  const {
    description, fieldName, propertyName, typeName,
    isNullable, isArray, isArrayElementNullable
  } = property;
  const name = fieldName || propertyName;

  if (description) {
    description.split('\n')
      .forEach(line => {
        generator.printOnNewline(`// ${line.trim()}`);
      })
  }
  if (!standalone) {
    generator.printOnNewline(`${name}:`);
  }

  if (isNullable) {
    generator.print(' ?');
  }

  if (isArray) {
    generator.print('Array< ');
    if (isArrayElementNullable) {
      generator.print('?');
    }
  }

  generator.pushScope({ typeName: name });

  generator.withinBlock(() => {
    propertySets.forEach((propertySet, index, propertySets) => {
      generator.withinBlock(() => {
        propertyDeclarations(generator, propertySet);
      });
      if (index !== propertySets.length - 1) {
        generator.print(' |');
      }
    })
  }, '(', ')');

  generator.popScope();

  if (isArray) {
    generator.print(' >');
  }

  if (!standalone) {
    generator.print(',');
  }
}
