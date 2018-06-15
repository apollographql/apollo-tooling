import { LegacyInlineFragment } from 'apollo-codegen-core/lib/compiler/legacyIR';

import { propertyDeclarations, printDocComment } from './codeGeneration';
import { typeNameFromGraphQLType } from './types';

import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
import { GraphQLType } from "graphql";

export interface Property {
  fieldName?: string,
  fieldType?: GraphQLType,
  propertyName?: string,
  type?: GraphQLType,
  description?: string,
  typeName?: string,
  isComposite?: boolean,
  isNullable?: boolean,
  fields?: any[],
  inlineFragments?: LegacyInlineFragment[],
  fragmentSpreads?: any,
  isInput?: boolean,
  isArray?: boolean,
  isArrayElementNullable?: boolean | null,
}

export function interfaceDeclaration(generator: CodeGenerator, {
  interfaceName,
  noBrackets
}: { interfaceName: string, noBrackets?: boolean },
  closure: () => void) {
  generator.printNewlineIfNeeded();
  generator.printNewline();
  if (noBrackets) {
    generator.print(`export type ${interfaceName} = `);
  } else {
    // simple types are exposed with a more user friendly `interface`
    generator.print(`export interface ${interfaceName} `);
  }
  generator.pushScope({ typeName: interfaceName });
  if (noBrackets) {
    generator.withinBlock(closure, '', '');
  } else {
    generator.withinBlock(closure, '{', '}');
  }
  generator.popScope();
  generator.print(';');
}

export function propertyDeclaration(generator: CodeGenerator, {
  fieldName,
  type,
  propertyName,
  typeName,
  description,
  isInput,
  isArray,
  isNullable,
  isArrayElementNullable
}: Property, closure?: () => void) {
  const name = fieldName || propertyName;

  printDocComment(generator, description);

  if (closure) {
    generator.printOnNewline(name);

    if (isNullable && isInput) {
      generator.print('?');
    }
    generator.print(': ');

    if (isArray) {
      generator.print(' Array<');
    }
    generator.pushScope({ typeName: name });

    generator.withinBlock(closure);

    generator.popScope();

    if (isArray) {
      if (isArrayElementNullable) {
        generator.print(' | null');
      }
      generator.print(' >');
    }

    if (isNullable) {
      generator.print(' | null');
    }

  } else {
    generator.printOnNewline(name);
    if (isInput && isNullable) {
      generator.print('?')
    }
    generator.print(`: ${typeName || type && typeNameFromGraphQLType(generator.context, type)}`);
  }
  generator.print(',');
}

export function propertySetsDeclaration(generator: CodeGenerator, property: Property, propertySets: Property[][], standalone = false) {
  const {
    description, fieldName, propertyName,
    isNullable, isArray, isArrayElementNullable,
  } = property;
  const name = fieldName || propertyName;

  printDocComment(generator, description);

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
    if (isArrayElementNullable) {
      generator.print(' | null');
    }
    generator.print(' >');
  }

  if (isNullable) {
    generator.print(' | null');
  }

  if (!standalone) {
    generator.print(',');
  }
}
