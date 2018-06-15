import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  isAbstractType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLObjectType,
  GraphQLUnionType
} from 'graphql'

import {
  wrap,
} from 'apollo-codegen-core/lib/utilities/printing';

import {
  sortEnumValues
} from 'apollo-codegen-core/lib/utilities/graphql';

import CodeGenerator from 'apollo-codegen-core/lib/utilities/CodeGenerator';

import {
  typeDeclaration,
  propertyDeclaration,
  propertySetsDeclaration,
  Property
} from './language';

import {
  typeNameFromGraphQLType,
} from './types';
import { LegacyCompilerContext, LegacyOperation, LegacyFragment, LegacyField } from "apollo-codegen-core/lib/compiler/legacyIR";
import { GraphQLType } from "graphql";
import { GraphQLAbstractType } from "graphql";

export function generateSource(context: LegacyCompilerContext) {
  const generator = new CodeGenerator(context);

  generator.printOnNewline('/* @flow */');
  generator.printOnNewline('/* eslint-disable */');
  generator.printOnNewline('//  This file was automatically generated and should not be edited.');
  context.typesUsed.forEach(type =>
    typeDeclarationForGraphQLType(generator, type)
  );
  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    typeDeclarationForOperation(generator, operation);
  });
  Object.values(context.fragments).forEach(fragment => {
    typeDeclarationForFragment(generator, fragment)
  });

  return generator.output;
}

export function typeDeclarationForGraphQLType(generator: CodeGenerator<LegacyCompilerContext>, type: GraphQLType) {
  if (type instanceof GraphQLEnumType) {
    enumerationDeclaration(generator, type);
  } else if (type instanceof GraphQLInputObjectType) {
    structDeclarationForInputObjectType(generator, type);
  }
}

function enumerationDeclaration(generator: CodeGenerator<LegacyCompilerContext>, type: GraphQLEnumType) {
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
  generator: CodeGenerator<LegacyCompilerContext>,
  type: GraphQLInputObjectType
) {
  const interfaceName = type.name;
  typeDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, Object.values(type.getFields()).map(v => {
      return {
        fieldName: v.name,
        responseName: v.name,
        ...v
      };
    }));
    propertyDeclarations(generator, properties, true);
  });
}

function interfaceNameFromOperation({operationName, operationType}: {
  operationName: string,
  operationType: string
}) {
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
  generator: CodeGenerator<LegacyCompilerContext>,
  {
    operationName,
    operationType,
    variables,
  }: LegacyOperation
): void {
  if (!variables || variables.length < 1) {
    return;
  }
  const interfaceName = `${interfaceNameFromOperation({operationName, operationType})}Variables`;

  typeDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, variables.map(v => {
      return {
        fieldName: v.name,
        responseName: v.name,
        ...v
      };
    }));
    propertyDeclarations(generator, properties, true);
  });
}

function getObjectTypeName(type: GraphQLType): string {
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
  generator: CodeGenerator<LegacyCompilerContext>,
  {
    operationName,
    operationType,
    fields,
  }: LegacyOperation
) {
  const interfaceName = interfaceNameFromOperation({operationName, operationType});
  const transformedFields = fields.map(rootField => {
    const fields = rootField.fields && rootField.fields.map(field => {
      if (field.fieldName === '__typename') {
        const objectTypeName = getObjectTypeName(rootField.type);
        return {
          ...field,
          typeName: objectTypeName,
          type: { name: objectTypeName },
        } as any as LegacyField;
      }
      return field;
    });
    return {
      ...rootField,
      fields,
    };
  });
  const properties = propertiesFromFields(generator.context, transformedFields);
  typeDeclaration(generator, {
    interfaceName,
  }, () => {
    propertyDeclarations(generator, properties);
  });
}

export function typeDeclarationForFragment(
  generator: CodeGenerator<LegacyCompilerContext>,
  fragment: LegacyFragment
) {
  const {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments,
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
            return inlineFragment.typeCondition.toString() == type.toString()
          });

          if (inlineFragment) {
            const fields = inlineFragment.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${inlineFragment.typeCondition}"`,
                  type: { name: `"${inlineFragment.typeCondition}"` }
                } as any as LegacyField
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator.context, fields);
          } else {
            const fragmentFields = fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${type}"`,
                  type: { name: `"${type}"` }
                } as any as LegacyField
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator.context, fragmentFields);
          }
        });

      propertySetsDeclaration(generator, fragment, propertySets, true);
    } else {
      const fragmentFields: LegacyField[] = fields.map(field => {
        if (field.fieldName === '__typename') {
          return {
            ...field,
            typeName: `"${fragment.typeCondition}"`,
            type: { name: `"${fragment.typeCondition}"` }
          } as any as LegacyField
        } else {
          return field;
        }
      });
      const properties = propertiesFromFields(generator.context, fragmentFields)
      propertyDeclarations(generator, properties);
    }
  });
}

export function propertiesFromFields(context: LegacyCompilerContext, fields: LegacyField[]) {
  return fields.map(field => propertyFromField(context, field));
}

export function propertyFromField(context: LegacyCompilerContext, field: LegacyField): Property {
  let { fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;
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

export function propertyDeclarations(generator: CodeGenerator<LegacyCompilerContext>, properties: Property[], isInput?: boolean) {
  if (!properties) return;
  properties.forEach(property => {
    if (isAbstractType(getNamedType((property.type || property.fieldType) as GraphQLType))) {
      const propertySets = getPossibleTypeNames(generator, property)
        .map(type => {
          const inlineFragment = property.inlineFragments ? property.inlineFragments.find(inlineFragment => {
            return inlineFragment.typeCondition.toString() == type
          }) : undefined;

          if (inlineFragment) {
            const fields = inlineFragment.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${inlineFragment.typeCondition}"`,
                  type: { name: `"${inlineFragment.typeCondition}"` }
                } as any as LegacyField
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator.context, fields);
          } else {
            const fields = property.fields ? property.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${type}"`,
                  type: { name: `"${type}"` }
                } as any as LegacyField
              } else {
                return field;
              }
            }) : [];

            return propertiesFromFields(generator.context, fields);
          }
        });

      propertySetsDeclaration(generator, property, propertySets);
    } else {
      if (property.fields && property.fields.length > 0
        || property.inlineFragments && property.inlineFragments.length > 0
        || property.fragmentSpreads && property.fragmentSpreads.length > 0
      ) {
        propertyDeclaration(generator, property, () => {
          const fields = property.fields ? property.fields.map(field => {
            if (field.fieldName === '__typename') {
              const objectTypeName = getObjectTypeName((property.fieldType || property.type) as GraphQLType);
              return {
                ...field,
                typeName: objectTypeName,
                type: { name: objectTypeName }
              }
            } else {
              return field;
            }
          }) : [];
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
function getPossibleTypeNames(generator: CodeGenerator<LegacyCompilerContext>, property: Property) {
  return generator.context.schema.getPossibleTypes(getNamedType((property.fieldType || property.type) as GraphQLType) as GraphQLAbstractType).map(type => type.name);
}
