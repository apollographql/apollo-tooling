import { camelCase, pascalCase } from 'change-case';

import {
  join,
  block,
  wrap,
  indent
} from '../utilities/printing';

import { escapedString, multilineString } from './strings'
import { typeNameFromGraphQLType, typeDeclarationForGraphQLType } from './types';
import { classDeclarationForOperation } from './operations'
import { classDeclarationForFragment } from './fragments'

export function generateSource(context) {
  const operations = context.compileOperations();
  const fragments = context.compileFragments();

  const typeDeclarations = context.typesUsed.map(typeDeclarationForGraphQLType);
  const operationClassDeclarations = operations.map(classDeclarationForOperation);
  const fragmentClassDeclarations = fragments.map(classDeclarationForFragment);

  return join([
    '//  This file was automatically generated and should not be edited.\n\n',
    importDeclarations() + '\n',
    wrap('\n', join(typeDeclarations, '\n\n'), '\n'),
    wrap('\n', join(operationClassDeclarations, '\n\n'), '\n'),
    wrap('\n', join(fragmentClassDeclarations, '\n\n'), '\n')
  ]);
}

function importDeclarations() {
  return 'import Apollo';
}
