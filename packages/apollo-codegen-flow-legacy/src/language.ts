import { propertyDeclarations } from './codeGeneration';
import { typeNameFromGraphQLType } from './types';

import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
import { LegacyCompilerContext, LegacyInlineFragment } from "apollo-codegen-core/lib/compiler/legacyIR";
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

export function typeDeclaration(
  generator: CodeGenerator<LegacyCompilerContext>,
  { interfaceName, noBrackets }: { interfaceName: string, noBrackets?: boolean },
  closure: Function
) {
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

export function propertyDeclaration(generator: CodeGenerator<LegacyCompilerContext>, {
  fieldName,
  type,
  propertyName,
  typeName,
  description,
  isArray,
  isNullable,
  isArrayElementNullable,
  isInput
}: Property, closure?: Function, open = ' {|', close = '|}') {
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
    generator.print(`: ${typeName || typeNameFromGraphQLType(generator.context, type as GraphQLType)}`);
  }
  generator.print(',');
}

export function propertySetsDeclaration(generator: CodeGenerator<LegacyCompilerContext>, property: Property, propertySets: Property[][], standalone = false) {
  const {
    description, fieldName, propertyName,
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
