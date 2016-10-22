import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  isAbstractType,
  isEqualType,
  GraphQLScalarType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLID,
  GraphQLInputObjectType
} from 'graphql'

import  { isTypeProperSuperTypeOf } from '../utilities/graphql';

import { camelCase, pascalCase } from 'change-case';
import Inflector from 'inflected';

import {
  join,
  wrap,
} from '../utilities/printing';

import CodeGenerator from '../utilities/CodeGenerator';

import {
  interfaceDeclaration,
} from './language';

export function generateSource(context) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  typeDeclarationForGraphQLType(context.typesUsed.forEach(type =>
    typeDeclarationForGraphQLType(generator, type)
  ));
  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    interfaceDeclarationForOperation(generator, operation);
  });
  Object.values(context.fragments).forEach(operation =>
    interfaceDeclarationForFragment(generator, operation)
  );

  return generator.output;
}

export function typeDeclarationForGraphQLType(generator, type) {
  if (type instanceof GraphQLEnumType) {
    enumerationDeclaration(generator, type);
  } else if (type instanceof GraphQLInputObjectType) {
    structDeclarationForInputObjectType(generator, type);
  }
}

function enumerationDeclaration(generator, type) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  generator.printOnNewline(description && `// ${description}`);
  generator.printOnNewline(`type ${name} =`);
  const nValues = values.length;
  values.forEach((value, i) => 
    generator.printOnNewline(`  "${value.value}"${i === nValues-1 ? ';' : ','}${wrap(' // ', value.description)}`)
  );
  generator.printNewline();
}

function structDeclarationForInputObjectType(generator, type) {
  // TODO
}

function interfaceNameFromOperation({operationName, operationType}) {
  switch (operationType) {
    case 'query':
      return `${pascalCase(operationName)}Query`;
      break;
    case 'mutation':
      return `${pascalCase(operationName)}Mutation`;
      break;
    case 'subscription':
      return `${pascalCase(operationName)}Subscription`;
      break;
    default:
      throw new GraphQLError(`Unsupported operation type "${operationType}"`);
  }
}

export function interfaceVariablesDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    fields,
    fragmentsReferenced,
    source,
  }
) {
  if (!variables || Object.keys(variables).length < 1) {
    return null;
  }
  const interfaceName = `${interfaceNameFromOperation({operationName, operationType})}Variables`;

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {

  });
}

export function interfaceDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    fields,
    fragmentsReferenced,
    source,
  }
) {
  const interfaceName = interfaceNameFromOperation({operationName, operationType});

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {

  });
}

export function interfaceDeclarationForFragment(
  generator,
  {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source,
  }
) {
  const interfaceName = `${fragmentName}On${typeCondition}Fragment`;

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {

  });
}
