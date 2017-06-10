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
import * as Inflector from 'inflected';

import {
  join,
  wrap,
} from '../utilities/printing';

import CodeGenerator from '../utilities/CodeGenerator';

import {
  typeDeclaration,
  propertyDeclaration,
  unionDeclaration
} from './language';

import {
  typeNameFromGraphQLType,
} from './types';

export function generateSource(context, options) {
  const generator = new CodeGenerator(context);
  generator.printOnNewline('/* @flow */');
  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  typeDeclarationForGraphQLType(context.typesUsed.forEach(type =>
    typeDeclarationForGraphQLType(generator, type)
  ));

  // When an object has fragment spreads or inline fragments
  // and __typename is requested at the top level, __typename
  // needs to be added as a property of the fragments
  const fragmentsWithTypenameField = {};
  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    typeDeclarationForOperation(generator, operation, fragmentsWithTypenameField);
  });

  Object.values(context.fragments).forEach(operation =>
    typeDeclarationForFragment(generator, operation, fragmentsWithTypenameField)
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
    generator.printOnNewline(`  "${value.value}"${i === nValues-1 ? ';' : ' |'}${wrap(' // ', value.description)}`)
  );
  generator.printNewline();
}

function structDeclarationForInputObjectType(
  generator,
  type
) {
  const interfaceName = pascalCase(type.name);
  typeDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, Object.values(type.getFields()));
    propertyDeclarations(generator, properties, true);
  });
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

  typeDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, variables);
    propertyDeclarations(generator, properties, true);
  });
}

export function typeDeclarationForOperation(
  generator,
  {
    operationName,
    operationType,
    variables,
    fields,
    fragmentSpreads,
    inlineFragments,
    fragmentsReferenced,
    source,
  },
  fragmentsWithTypenameField
) {
  if (hasTypenameField(fields)) {
    console.error('__typename on operations are not yet supported');
  }
  const interfaceName = interfaceNameFromOperation({operationName, operationType});
  const properties = propertiesFromFields(generator.context, fields, {
    typeNameSuffix: `From${operationName}`
  });

  typeDeclaration(generator, { interfaceName }, () => {
    propertyDeclarations(generator, properties, true);
  });

  properties.forEach(({ fragmentSpreads, inlineFragments, bareTypeName }) => {
    if (fragmentSpreads.length > 0) {
      fragmentSpreads.forEach(fragmentSpread => {
        fragmentsWithTypenameField[fragmentSpread] = true;
      });
    }

    if (inlineFragments.length > 0) {
      const fragmentName = `${pascalCase(bareTypeName)}From${operationName}`;
      handleInlineFragments(generator, fragmentName, inlineFragments);
    }
  });
}

export function typeDeclarationForFragment(
  generator,
  {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source,
    possibleTypes
  },
  fragmentsWithTypenameField
) {
  const interfaceName = `${pascalCase(fragmentName)}Fragment`;

  if (inlineFragments.length > 0) {
    handleInlineFragments(generator, interfaceName, inlineFragments);
  } else {
    typeDeclaration(generator, {
      interfaceName,
      // extendTypes: fragmentSpreads ? fragmentSpreads.map(f => `${pascalCase(f)}Fragment`) : null,
    }, () => {
      if (fragmentsWithTypenameField[fragmentName]) {
        addTypenameFieldIfNeeded(generator, fields, typeCondition);
      }

      const properties = propertiesFromFields(generator.context, fields, {
        typeNameSuffix: 'Fragment'
      });

      propertyDeclarations(generator, properties, true);
    });
  }
}

export function propertiesFromFields(context, fields, { forceNullable, typeNameSuffix } = {}) {
  return fields.map(field => propertyFromField(context, field, { forceNullable, typeNameSuffix }));
}

export function propertyFromField(context, field, { forceNullable, typeNameSuffix } = {}) {
  let { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;
  fieldName = fieldName || field.responseName;

  const propertyName = fieldName;
  let property = { fieldName, fieldType, propertyName, description, inlineFragments };
  const namedType = getNamedType(fieldType);

  if (isCompositeType(namedType)) {
    let typeName, bareTypeName;
    if (propertyName === '__typename') {
      // Handle the __typename field specially. the fieldType is set
      // to the parentType but we want the target type to be a string literal
      // of the parentType.
      bareTypeName = `"${fieldType}"`;
      typeName = `"${fieldType}"`;
    } else {
      bareTypeName = pascalCase(Inflector.singularize(propertyName));
      if (
        inlineFragments && inlineFragments.length > 0 ||
        fragmentSpreads && fragmentSpreads.length > 0
      ) {
        typeName = typeNameFromGraphQLType(context, fieldType, `${pascalCase(bareTypeName)}${typeNameSuffix}`);
      } else {
        typeName = typeNameFromGraphQLType(context, fieldType, bareTypeName);
      }
    }
    let isArray = false;
    if (fieldType instanceof GraphQLList) {
      isArray = true;
    } else if (fieldType instanceof GraphQLNonNull && fieldType.ofType instanceof GraphQLList) {
      isArray = true;
    }
    let isNullable = true;
    if (fieldType instanceof GraphQLNonNull && !forceNullable) {
      isNullable = false;
    }
    return {
      ...property,
      typeName, bareTypeName, fields: field.fields, isComposite: true, fragmentSpreads, inlineFragments, fieldType,
      isArray, isNullable,
    };
  } else {
    const typeName = typeNameFromGraphQLType(context, fieldType);
    return { ...property, typeName, isComposite: false, fieldType };
  }
}

export function propertyDeclarations(generator, properties, inInterface) {
  if (!properties) return;
  properties.forEach(property => {
    if (
      property.fields && property.fields.length > 0 ||
      property.inlineFragments && property.inlineFragments.length > 0
    ) {
      if (property.inlineFragments.length > 0 ) {
        propertyDeclaration(generator, {
          ...property,
          inInterface,
        });
      } else {
        propertyDeclaration(generator, {...property, inInterface}, () => {
          const properties = propertiesFromFields(generator.context, property.fields)
          propertyDeclarations(generator, properties);
        });
      }
    } else {
      propertyDeclaration(generator, {...property, inInterface});
    }
  });
}

function makeTypenameField(typeName) {
  return {
    responseName: '__typename',
    fieldName: '__typename',
    type: typeName,
  };
}

function hasTypenameField(fields) {
  if (!fields) {
    return false;
  }

  return fields.find(field => field.fieldName === '__typename' || field.responseName === '__typename');
}

function removeTypenameFieldIfExists(generator, fields) {
  if (hasTypenameField(fields)) {
    fields = fields.filter(field => field.fieldName !== '__typename' || field.responseName !== '__typename');
    return true;
  } else {
    return false;
  }
}

/**
 * NOTE: Mutates `fields`
 */
function addTypenameFieldIfNeeded(generator, fields, parentTypeName) {
  const removed = removeTypenameFieldIfExists();

  if (generator.context.addTypename || removed) {
    fields.unshift(makeTypenameField(parentTypeName));
  }
}

function handleInlineFragments(generator, fragmentName, inlineFragments) {
  // Keep track of these generated destination type names so we can build a union afterwards
  let unionTypes = [];
  inlineFragments.forEach(({ fields, typeCondition }) => {
    const typeName = `${fragmentName}On${typeCondition}`;
    unionTypes.push(typeName);

    addTypenameFieldIfNeeded(generator, fields, typeCondition);

    let properties = propertiesFromFields(generator.context, fields, {
      typeNameSuffix: 'Fragment'
    });

    typeDeclaration(generator, {
      interfaceName: typeName,
    }, () => {
      propertyDeclarations(generator, properties, true);
    })

    properties.forEach(({ inlineFragments, bareTypeName }) => {
      if (inlineFragments && inlineFragments.length > 0) {
        const innerFragmentName = `${bareTypeName}Fragment`;
        handleInlineFragments(generator, innerFragmentName, inlineFragments);
      }
    });
  });

  // TODO: Refactor typeDeclaration to not automatically assume bracketed type
  typeDeclaration(generator, { interfaceName: fragmentName, noBrackets: true }, () => {
    unionDeclaration(generator, unionTypes);
  });
}
