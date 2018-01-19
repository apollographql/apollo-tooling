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
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLUnionType
} from 'graphql'

import  { isTypeProperSuperTypeOf } from '../utilities/graphql';

import * as Inflector from 'inflected';

import {
  join,
  wrap,
} from '../utilities/printing';

import {
  sortEnumValues
} from '../utilities/graphql';

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
  generator.printOnNewline('/* eslint-disable */');
  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  typeDeclarationForGraphQLType(context.typesUsed.forEach(type =>
    typeDeclarationForGraphQLType(generator, type)
  ));
  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    typeDeclarationForOperation(generator, operation);
  });
  Object.values(context.fragments).forEach(fragment => {
    typeDeclarationForFragment(generator, fragment)
  });

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
  if (description) {
    description.split('\n')
      .forEach(line => {
        generator.printOnNewline(`// ${line.trim()}`);
      })
  }
  generator.printOnNewline(`export type ${name} =`);
  const nValues = values.length;
  sortEnumValues(values).forEach((value, i) => {
    if (!value.description || value.description.indexOf('\n') === -1) {
      generator.printOnNewline(`  "${value.value}"${i === nValues - 1 ? ';' : ' |'}${wrap(' // ', value.description)}`)
    } else {
      if (value.description) {
        value.description.split('\n')
          .forEach(line => {
            generator.printOnNewline(`  // ${line.trim()}`);
          })
      }
      generator.printOnNewline(`  "${value.value}"${i === nValues - 1 ? ';' : ' |'}`)
    }
  });
  generator.printNewline();
}

function structDeclarationForInputObjectType(
  generator,
  type
) {
  const interfaceName = type.name;
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
      return `${operationName}Query`;
      break;
    case 'mutation':
      return `${operationName}Mutation`;
      break;
    case 'subscription':
      return `${operationName}Subscription`;
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

function getObjectTypeName(type) {
  if (type instanceof GraphQLList) {
    return getObjectTypeName(type.ofType);
  }
  if (type instanceof GraphQLNonNull) {
    return getObjectTypeName(type.ofType);
  }
  if (type instanceof GraphQLObjectType) {
    return `"${type.name}"`;
  }
  if (type instanceof GraphQLUnionType) {
    return type.getTypes().map(type => getObjectTypeName(type)).join(" | ");
  }
  return `"${type.name}"`;
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
  fields = fields.map(rootField => {
    const fields = rootField.fields && rootField.fields.map(field => {
      if (field.fieldName === '__typename') {
        const objectTypeName = getObjectTypeName(rootField.type);
        return {
          ...field,
          typeName: objectTypeName,
          type: { name: objectTypeName },
        };
      }
      return field;
    });
    return {
      ...rootField,
      fields,
    };
  });
  const properties = propertiesFromFields(generator.context, fields);
  typeDeclaration(generator, {
    interfaceName,
  }, () => {
    propertyDeclarations(generator, properties);
  });
}

export function typeDeclarationForFragment(
  generator,
  fragment
) {
  const {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
    fragmentSpreads,
    source,
  } = fragment;

  const interfaceName = `${fragmentName}Fragment`;

  typeDeclaration(generator, {
    interfaceName,
    noBrackets: isAbstractType(typeCondition)
  }, () => {
    if (isAbstractType(typeCondition)) {
      const propertySets = fragment.possibleTypes
        .map(type => {
          // NOTE: inlineFragment currently consists of the merged fields
          // from both inline fragments and fragment spreads.
          // TODO: Rename inlineFragments in the IR.
          const inlineFragment = inlineFragments.find(inlineFragment => {
            return inlineFragment.typeCondition.toString() == type
          });

          if (inlineFragment) {
            const fields = inlineFragment.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${inlineFragment.typeCondition}"`,
                  type: { name: `"${inlineFragment.typeCondition}"` }
                }
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator, fields);
          } else {
            const fragmentFields = fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${type}"`,
                  type: { name: `"${type}"` }
                }
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator, fragmentFields);
          }
        });

      propertySetsDeclaration(generator, fragment, propertySets, true);
    } else {
      const fragmentFields = fields.map(field => {
        if (field.fieldName === '__typename') {
          return {
            ...field,
            typeName: `"${fragment.typeCondition}"`,
            type: { name: `"${fragment.typeCondition}"` }
          }
        } else {
          return field;
        }
      });
      const properties = propertiesFromFields(generator.context, fragmentFields)
      propertyDeclarations(generator, properties);
    }
  });
}

export function propertiesFromFields(context, fields) {
  return fields.map(field => propertyFromField(context, field));
}

export function propertyFromField(context, field) {
  let { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;
  fieldName = fieldName || field.responseName;

  const propertyName = fieldName;

  let property = { fieldName, fieldType, propertyName, description };

  let isNullable = true;
  if (fieldType instanceof GraphQLNonNull) {
    isNullable = false;
  }
  const namedType = getNamedType(fieldType);
  if (isCompositeType(namedType)) {
    const typeName = typeNameFromGraphQLType(context, fieldType);
    let isArray = false;
    let isArrayElementNullable = null;
    if (fieldType instanceof GraphQLList) {
      isArray = true;
      isArrayElementNullable = !(fieldType.ofType instanceof GraphQLNonNull);
    } else if (fieldType instanceof GraphQLNonNull && fieldType.ofType instanceof GraphQLList) {
      isArray = true;
      isArrayElementNullable = !(fieldType.ofType.ofType instanceof GraphQLNonNull);
    }
    return {
      ...property,
      typeName, fields: field.fields, isComposite: true, fragmentSpreads, inlineFragments, fieldType,
      isArray, isNullable, isArrayElementNullable,
    };
  } else {
    if (field.fieldName === '__typename') {
      const typeName = typeNameFromGraphQLType(context, fieldType, null, false);
      return { ...property, typeName, isComposite: false, fieldType, isNullable: false };
    } else {
      const typeName = typeNameFromGraphQLType(context, fieldType, null, isNullable);
      return { ...property, typeName, isComposite: false, fieldType, isNullable };
    }
  }
}

export function propertyDeclarations(generator, properties, isInput) {
  if (!properties) return;
  properties.forEach(property => {
    if (isAbstractType(getNamedType(property.type || property.fieldType))) {
      const propertySets = getPossibleTypeNames(generator, property)
        .map(type => {
          const inlineFragment = property.inlineFragments.find(inlineFragment => {
            return inlineFragment.typeCondition.toString() == type
          });

          if (inlineFragment) {
            const fields = inlineFragment.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${inlineFragment.typeCondition}"`,
                  type: { name: `"${inlineFragment.typeCondition}"` }
                }
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator, fields);
          } else {
            const fields = property.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${type}"`,
                  type: { name: `"${type}"` }
                }
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator, fields);
          }
        });

      propertySetsDeclaration(generator, property, propertySets);
    } else {
      if (property.fields && property.fields.length > 0
        || property.inlineFragments && property.inlineFragments.length > 0
        || property.fragmentSpreads && property.fragmentSpreads.length > 0
      ) {
        propertyDeclaration(generator, property, () => {
          const fields = property.fields.map(field => {
            if (field.fieldName === '__typename') {
              const objectTypeName = getObjectTypeName(property.fieldType || property.type);
              return {
                ...field,
                typeName: objectTypeName,
                type: { name: objectTypeName }
              }
            } else {
              return field;
            }
          });
          const properties = propertiesFromFields(generator.context, fields);
          propertyDeclarations(generator, properties, isInput);
        });
      } else {
        propertyDeclaration(generator, {...property, isInput});
      }
    }
  });
}

/**
 * This exists only to properly generate types for union/interface typed fields that
 * do not have inline fragments. This currently can happen and the IR does give us
 * a set of fields per type condition unless fragments are used within the selection set.
 */
function getPossibleTypeNames(generator, property) {
  return generator.context.schema.getPossibleTypes(getNamedType(property.fieldType || property.type)).map(type => type.name);
}
