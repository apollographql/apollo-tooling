import {
  join,
  wrap,
} from '../utilities/printing';

import { propertyDeclarations } from './codeGeneration';
import { typeNameFromGraphQLType } from './types';

import { pascalCase } from 'change-case';

export function interfaceDeclaration(generator, { interfaceName, noBrackets }, closure) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  generator.print(`export type ${ interfaceName } = `);
  generator.pushScope({ typeName: interfaceName });
  if (noBrackets) {
    generator.withinBlock(closure, '', '');
  } else {
    generator.withinBlock(closure, '{', '}');
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
  inInterface,
  fragmentSpreads
}, closure) {
  const name = fieldName || propertyName;

  if (description) {
    description.split('\n')
      .forEach(line => {
        generator.printOnNewline(`// ${line.trim()}`);
      })
  }

  if (closure) {
    generator.printOnNewline(`${name}: `);
    if (isArray) {
      generator.print(' Array<');
    }
    generator.pushScope({ typeName: name });
  
    generator.withinBlock(closure);
  
    generator.popScope();
  
    if (isArray) {
      generator.print(' >');
    }
  
    if (isNullable) {
      generator.print(' | null');
    }
  
  } else {
    generator.printOnNewline(`${name}: ${typeName || typeNameFromGraphQLType(generator.context, type)}`);
  }
  generator.print(',');
}

export function propertySetsDeclaration(generator, property, propertySets, standalone = false) {
  const { description, fieldName, propertyName, typeName, isNullable, isArray } = property;
  const name = fieldName || propertyName;

  if (description) {
    description.split('\n')
      .forEach(line => {
        generator.printOnNewline(`// ${line.trim()}`);
      })
  }

  if (!standalone) {
    generator.printOnNewline(`${name}: `);
  }

  if (isArray) {
    generator.print(' Array<');
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

  if (isNullable) {
    generator.print(' | null');
  }

  if (!standalone) {
    generator.print(',');
  }
}
