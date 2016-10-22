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
  propertyDeclaration,
} from './language';

import {
  typeNameFromGraphQLType,
} from './types';

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
  generator.printOnNewline(`export type ${name} =`);
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
  if (!variables || variables.length < 1) {
    return null;
  }
  const interfaceName = `${interfaceNameFromOperation({operationName, operationType})}Variables`;

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, variables);
    propertyDeclarations(generator, properties, true);
  });
}

export function interfaceDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    fields,
    fragmentSpreads,
    fragmentsReferenced,
    source,
  }
) {
  const interfaceName = interfaceNameFromOperation({operationName, operationType});

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, fields);
    propertyDeclarations(generator, properties, true);
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
  const interfaceName = `${pascalCase(fragmentName)}On${pascalCase(typeCondition)}Fragment`;

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, fields);
    propertyDeclarations(generator, properties, true);
  });
}

export function propertiesFromFields(context, fields) {
  return fields.map(field => propertyFromField(context, field));
}

export function propertyFromField(context, field) {
  const { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;

  const propertyName = camelCase(fieldName);

  let property = { fieldName, fieldType, propertyName, description };

  const namedType = getNamedType(fieldType);

  if (isCompositeType(namedType)) {
    const bareTypeName = pascalCase(Inflector.singularize(propertyName));
    const typeName = typeNameFromGraphQLType(context, fieldType, bareTypeName);
    return { ...property, typeName, bareTypeName, fields: field.fields, isComposite: true, fragmentSpreads, inlineFragments };
  } else {
    const typeName = typeNameFromGraphQLType(context, fieldType);
    return { ...property, typeName, isComposite: false };
  }
}

export function propertyDeclarations(generator, properties, inInterface) {
  if (!properties) return;
  properties.forEach(property => {
    if (property.fields) {
      propertyDeclaration(generator, {...property, inInterface}, () => {
        const properties = propertiesFromFields(generator.context, property.fields);
        propertyDeclarations(generator, properties);
      });
    } else {
      propertyDeclaration(generator, {...property, inInterface});
    }
  });
}
