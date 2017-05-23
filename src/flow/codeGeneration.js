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
  propertySetsDeclaration
} from './language';

import {
  typeNameFromGraphQLType,
} from './types';

export function generateSource(context) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('/* @flow */');
  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  typeDeclarationForGraphQLType(context.typesUsed.forEach(type =>
    typeDeclarationForGraphQLType(generator, type)
  ));

  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    typeDeclarationForOperation(generator, operation);
  });
  Object.values(context.fragments).forEach(operation =>
    typeDeclarationForFragment(generator, operation)
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
    fragmentsReferenced,
    source,
  }
) {
  const interfaceName = interfaceNameFromOperation({operationName, operationType});
  typeDeclaration(generator, {
    interfaceName,
    extendTypes: fragmentSpreads ? fragmentSpreads.map(f => `${pascalCase(f)}Fragment`) : null,
  }, () => {
    const properties = propertiesFromFields(generator.context, fields);
    propertyDeclarations(generator, properties, true);
  });

  properties.forEach(({ fragmentSpreads, inlineFragments, bareTypeName }) => {
    if (fragmentSpreads && fragmentSpreads.length > 0) {
      fragmentSpreads.forEach(fragmentSpread => {
        fragmentsWithTypenameField[fragmentSpread] = true;
      });
    }

    if (inlineFragments && inlineFragments.length > 0) {
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
  }
) {
  const interfaceName = `${pascalCase(fragmentName)}Fragment`;

  typeDeclaration(generator, {
    interfaceName,
    extendTypes: fragmentSpreads ? fragmentSpreads.map(f => `${pascalCase(f)}Fragment`) : null,
  }, () => {
    /*
    const properties = propertiesFromFields(generator.context, fields)
    .concat(...(inlineFragments || []).map(fragment =>
      propertiesFromFields(generator.context, fragment.fields, true)
    ));
    */
    const properties = propertiesFromFields(generator.context, fields)
    // if (inlineFragments.length > 0) console.log(inlineFragments);
    // if (fragmentSpreads.length > 0) console.log(fragmentSpreads);

    propertyDeclarations(generator, properties, true);
    // TODO: Implement this
    // unionDeclarations(generator, [properties], true);
  });
}

export function propertiesFromFields(context, fields, forceNullable) {
  return fields.map(field => propertyFromField(context, field, forceNullable));
}

export function propertyFromField(context, field, forceNullable) {
  let { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;
  fieldName = fieldName || field.responseName;

  const propertyName = fieldName;

  let property = { fieldName, fieldType, propertyName, description };

  const namedType = getNamedType(fieldType);

  if (isCompositeType(namedType)) {
    const bareTypeName = pascalCase(Inflector.singularize(propertyName));
    const typeName = typeNameFromGraphQLType(context, fieldType, bareTypeName);
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
      isArray, isNullable, isAbstract: isAbstractType(getNamedType(fieldType))
    };
  } else {
    const typeName = typeNameFromGraphQLType(context, fieldType);
    return { ...property, typeName, isComposite: false, fieldType };
  }
}

export function propertyDeclarations(generator, properties, inInterface) {
  if (!properties) return;
  properties.forEach(property => {
    if (property.isAbstract) {
      const fieldSets = computeFieldSetsOfAbstractTypeProperty(generator, property);
      const propertySets = Object.keys(fieldSets)
        .map(typeCondition => fieldSets[typeCondition].fields)
        .map(fields => propertiesFromFields(generator.context, fields));

      propertySetsDeclaration(generator, property, propertySets);
    } else {
      if (property.fields && property.fields.length > 0 || property.inlineFragments && property.inlineFragments.length > 0) {
        propertyDeclaration(generator, {...property, inInterface}, () => {
          const properties = propertiesFromFields(generator.context, property.fields)
          .concat(...(property.inlineFragments || []).map(fragment =>
            propertiesFromFields(generator.context, fragment.fields, true)
          ));
          propertyDeclarations(generator, properties);
        });
      } else {
        propertyDeclaration(generator, {...property, inInterface});
      }
    }
  });
}

/**
 * Given properties, fragments, and inline spreads, compute the resulting property sets. The number of property sets
 * is upper-bounded by the possible type conditions for this property.
 *
 * NOTE: The IR already merges fragmentSpreads and fields into inline fragments -- however it does not do the same
 * for fragmentSpreads. The logic here accounts for that.
 */
function computeFieldSetsOfAbstractTypeProperty(generator, property) {
  const { fieldName, fields, inlineFragments, fragmentSpreads, typeName, fieldType, isArray, isNullable } = property;

  const concreteTypes = getConcreteTypesForAbstractType(generator, getNamedType(fieldType));
  const fieldSetMap = {};
  concreteTypes.forEach(concreteType => { fieldSetMap[concreteType] = { fields: [] }; });
  _resolveSelectionSet(generator, fieldSetMap, property);

  return fieldSetMap; 
}

function _resolveSelectionSet(generator, fieldSetMap, selectionSet, fromFragment = false) {
  const {typeCondition, fieldType, inlineFragments, fragmentSpreads, fields} = selectionSet;


  if (
    isAbstractType(getNamedType(fieldType)) ||   // properties have fieldTypes
    isAbstractType(getNamedType(typeCondition))  // fragments have type conditions
   ) {
    const type = getNamedType(fieldType || typeCondition);

    getConcreteTypesForAbstractType(generator, type).forEach(concreteType => {
      fieldSetMap[concreteType].fields = mergeFields(fieldSetMap[concreteType].fields, fields);
    });

    inlineFragments.forEach(inlineFragment => {
      inlineFragment.possibleTypes.forEach(concreteType => {
        fieldSetMap[concreteType].fields = mergeFields(fieldSetMap[concreteType].fields, inlineFragment.fields);
      });
    });

    fragmentSpreads.forEach(fragmentSpread => {
      const fragment = generator.context.fragments[fragmentSpread];
      _resolveSelectionSet(generator, fieldSetMap, fragment, true);
    });
  } else {
    const concreteType = getNamedType(typeCondition);
    // handle fragment spread on a concrete type
    fieldSetMap[concreteType].fields = mergeFields(
      fieldSetMap[concreteType].fields,
      fields
    );
  }
}

function mergeFields(destFields, sourceFields) {
  sourceFields.forEach(sourceField => {
    if (destFields.every(field => field.fieldName !== sourceField.fieldName)) {
      destFields = destFields.concat(sourceField);
    }
  });

  return destFields;
}

function getConcreteTypesForAbstractType(generator, typeName) {
  const possibleTypeMap = generator.context.schema._possibleTypeMap[typeName];
  if (possibleTypeMap) {
    return Object.keys(possibleTypeMap);
  } else {
    return [];
  }
}
