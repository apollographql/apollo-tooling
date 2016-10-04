import { camelCase, pascalCase } from 'change-case';

import {
  join,
  wrap,
} from '../utilities/printing';

import CodeGenerator from '../CodeGenerator';

import { escapedString, multilineString } from './strings'
import { typeNameFromGraphQLType, typeDeclarationForGraphQLType } from './types';
import { classDeclarationForOperation } from './operations'
import { classDeclarationForFragment, protocolDeclarationForFragment } from './fragments'

export function generateSource(compiler) {
  const operations = compiler.compileOperations();
  const fragments = compiler.compileFragments();

  const context = new CodeGenerator();

  context.printOnNewline('//  This file was automatically generated and should not be edited.');
  context.printNewline();
  context.printOnNewline('import Apollo');

  compiler.typesUsed.forEach(type => {
    typeDeclarationForGraphQLType(context, type);
  });

  operations.forEach(operation => {
    classDeclarationForOperation(context, operation);
  });

  fragments.forEach(fragment => {
    classDeclarationForFragment(context, fragment);
    protocolDeclarationForFragment(context, fragment);
  });

  return context.output;
}
