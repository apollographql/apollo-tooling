import {
  join,
  wrap,
} from '../utilities/printing';

import { propertyDeclarations } from './codeGeneration';
import { typeNameFromGraphQLType } from './types';

import { pascalCase } from 'change-case';

function typeNameFromScopeStack(generator, name) {
  const scopeNames = generator.scopeStack
    .map((scope) => {
      return scope.typeName
    });

  const fullTypeName = [...scopeNames].join('_');

  return fullTypeName;
}

/**
 * Used to grab the type condition of a propertySet. Requires
 * having __typename fields to exist for a property set.
 * @throws Will throw an error if __typename field is not found
 * within the property set.
 */
function getPropertySetTypeCondition(propertySet) {
  const typenameField = propertySet.find(property => property.fieldName === '__typename');

  if (!typenameField) {
    throw new Error(`__typename field is required to generate types for nested properties that are of GraphQLUnionType or GraphQLInterfaceType`);
  }

  return typenameField.typeName.replace(/\"/g, '');
}

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
    }

    generator.pushScope({ typeName: name });
    const fullName = typeNameFromScopeStack(generator, name);
    generator.print(' ' + fullName);
    // generator.withinBlock(closure, open, close);
    generator.queueBlock(() => {
      typeDeclaration(generator, {
        interfaceName: fullName
      }, () => {
        closure()
      })
    })
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
  const { description, fieldName, propertyName, typeName, isNullable, isArray } = property;
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
  }

  const fullName = typeNameFromScopeStack(generator, name);
  generator.pushScope({ typeName: name });

  generator.withinBlock(() => {
    propertySets.forEach((propertySet, index, propertySets) => {
      generator.pushScope({ typeName: getPropertySetTypeCondition(propertySet) });
      const fullName = typeNameFromScopeStack(generator, name);
      generator.print(fullName)
      generator.queueBlock(() => {
        typeDeclaration(generator, {
          interfaceName: fullName
        }, () => {
          propertyDeclarations(generator, propertySet);
        });
      });
      generator.popScope();
      if (index !== propertySets.length - 1) {
        generator.print(' | ');
      }
    })
  }, '(', ')', false);

  generator.popScope();

  if (isArray) {
    generator.print(' >');
  }

  if (!standalone) {
    generator.print(',');
  }
}
