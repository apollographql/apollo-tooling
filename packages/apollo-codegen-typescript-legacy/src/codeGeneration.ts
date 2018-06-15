import {
  LegacyCompilerContext,
  LegacyInlineFragment,
  LegacyFragment,
  LegacyField,
  LegacyOperation
} from 'apollo-codegen-core/lib/compiler/legacyIR';

import {
  GraphQLError,
  getNamedType,
  isCompositeType,
  isAbstractType,
  GraphQLEnumType,
  GraphQLList,
  GraphQLNonNull,
  GraphQLInputObjectType,
  GraphQLType,
  GraphQLUnionType,
  GraphQLInterfaceType,
  GraphQLObjectType
} from 'graphql'

import {
  sortEnumValues
} from 'apollo-codegen-core/lib/utilities/graphql';

import CodeGenerator from 'apollo-codegen-core/lib/utilities/CodeGenerator';

import {
  interfaceDeclaration,
  propertyDeclaration,
  propertySetsDeclaration,
  Property
} from './language';

import {
  typeNameFromGraphQLType,
} from './types';

export function generateSource(context: LegacyCompilerContext) {
  const generator = new CodeGenerator<LegacyCompilerContext>(context);

  generator.printOnNewline('/* tslint:disable */');
  generator.printOnNewline('//  This file was automatically generated and should not be edited.');

  context.typesUsed.forEach(type =>
    typeDeclarationForGraphQLType(generator, type)
  );
  Object.values(context.operations).forEach(operation => {
    interfaceVariablesDeclarationForOperation(generator, operation);
    interfaceDeclarationForOperation(generator, operation);
  });
  Object.values(context.fragments).forEach(operation =>
    interfaceDeclarationForFragment(generator, operation)
  );

  generator.printNewline();

  return generator.output;
}

export function typeDeclarationForGraphQLType(generator: CodeGenerator, type: GraphQLType) {
  if (type instanceof GraphQLEnumType) {
    enumerationDeclaration(generator, type);
  } else if (type instanceof GraphQLInputObjectType) {
    structDeclarationForInputObjectType(generator, type);
  }
}

function enumerationDeclaration(generator: CodeGenerator, type: GraphQLEnumType) {
  const { name, description } = type;
  const values = type.getValues();

  generator.printNewlineIfNeeded();
  printDocComment(generator, description);
  generator.printOnNewline(`export enum ${name} {`);
  sortEnumValues(values).forEach((value) => {
    printDocComment(generator, value.description, 1);
    generator.printOnNewline(`  ${value.value} = "${value.value}",`)
  });
  generator.printOnNewline(`}`);
  generator.printNewline();
}

function structDeclarationForInputObjectType(
  generator: CodeGenerator,
  type: GraphQLInputObjectType
) {
  const interfaceName = type.name;
  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, Object.values(type.getFields()));
    propertyDeclarations(generator, properties, true);
  });
}

function interfaceNameFromOperation({ operationName, operationType }: { operationName: string, operationType: string }) {
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
  generator: CodeGenerator,
  {
    operationName,
    operationType,
    variables
  }: LegacyOperation
) {
  if (!variables || variables.length < 1) {
    return;
  }
  const interfaceName = `${interfaceNameFromOperation({ operationName, operationType })}Variables`;

  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    const properties = propertiesFromFields(generator.context, variables);
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

function updateTypeNameField(rootField: LegacyField): LegacyField {
  const fields = rootField.fields && rootField.fields.map(field => {
    if (field.fieldName === '__typename') {
      const objectTypeName = getObjectTypeName(rootField.type);
      return {
        ...field,
        typeName: objectTypeName,
        type: { name: objectTypeName },
      };
    }

    if (field.fields) {
      return updateTypeNameField(field);
    }

    return field;
  });
  return {
    ...rootField,
    fields,
  } as LegacyField;
}

export function interfaceDeclarationForOperation(
  generator: CodeGenerator,
  {
    operationName,
    operationType,
    fields
  }: LegacyOperation
) {
  const interfaceName = interfaceNameFromOperation({ operationName, operationType });
  fields = fields.map(field => updateTypeNameField(field));
  const properties = propertiesFromFields(generator.context, fields);
  interfaceDeclaration(generator, {
    interfaceName,
  }, () => {
    propertyDeclarations(generator, properties);
  });
}

export function interfaceDeclarationForFragment(
  generator: CodeGenerator,
  fragment: LegacyFragment
) {
  const {
    fragmentName,
    typeCondition,
    fields,
    inlineFragments
  } = fragment;

  const interfaceName = `${fragmentName}Fragment`;

  interfaceDeclaration(generator, {
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
                  type: { name: `"${inlineFragment.typeCondition}"` } as GraphQLType
                }
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
                  type: { name: `"${type}"` } as GraphQLType
                }
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator.context, fragmentFields);
          }
        });

      propertySetsDeclaration(generator, fragment, propertySets, true);
    } else {
      const fragmentFields = fields.map(field => {
        if (field.fieldName === '__typename') {
          return {
            ...field,
            typeName: `"${fragment.typeCondition}"`,
            type: { name: `"${fragment.typeCondition}"` } as GraphQLType
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

export function propertiesFromFields(context: LegacyCompilerContext, fields: {
  name?: string,
  type: GraphQLType,
  responseName?: string,
  description?: string,
  fragmentSpreads?: any,
  inlineFragments?: LegacyInlineFragment[],
  fieldName?: string
}[]) {
  return fields.map(field => propertyFromField(context, field));
}

export function propertyFromField(context: LegacyCompilerContext, field: {
  name?: string,
  type: GraphQLType,
  fields?: any[],
  responseName?: string,
  description?: string,
  fragmentSpreads?: any,
  inlineFragments?: LegacyInlineFragment[],
  fieldName?: string
}): Property {
  let { name: fieldName, type: fieldType, description, fragmentSpreads, inlineFragments } = field;
  fieldName = fieldName || field.responseName;

  const propertyName = fieldName;

  let property = { fieldName, fieldType, propertyName, description };

  const namedType = getNamedType(fieldType);

  let isNullable = true;
  if (fieldType instanceof GraphQLNonNull) {
    isNullable = false;
  }

  if (isCompositeType(namedType)) {
    const typeName = typeNameFromGraphQLType(context, fieldType);
    let isArray = false;
    let isArrayElementNullable = null;
    if (fieldType instanceof GraphQLList) {
      isArray = true;
      isArrayElementNullable = !(fieldType.ofType instanceof GraphQLNonNull);
    } else if (fieldType instanceof GraphQLNonNull && fieldType.ofType instanceof GraphQLList) {
      isArray = true
      isArrayElementNullable = !(fieldType.ofType.ofType instanceof GraphQLNonNull);
    }

    return {
      ...property,
      typeName,
      fields: field.fields,
      isComposite: true,
      fragmentSpreads, inlineFragments, fieldType,
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

export function propertyDeclarations(generator: CodeGenerator, properties: Property[], isInput = false) {

  if (!properties) return;
  properties.forEach(property => {
    if (isAbstractType(getNamedType(property.type || property.fieldType!))) {
      const propertySets = getPossibleTypeNames(generator, property)
        .map(type => {
          const inlineFragment = property.inlineFragments && property.inlineFragments.find(inlineFragment => {
            return inlineFragment.typeCondition.toString() == type
          });

          if (inlineFragment) {
            const fields = inlineFragment.fields.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${inlineFragment.typeCondition}"`,
                  type: { name: `"${inlineFragment.typeCondition}"` } as GraphQLType
                }
              } else {
                return field;
              }
            });

            return propertiesFromFields(generator.context, fields);
          } else {
            const fields = property.fields!.map(field => {
              if (field.fieldName === '__typename') {
                return {
                  ...field,
                  typeName: `"${type}"`,
                  type: { name: `"${type}"` } as GraphQLType
                }
              } else {
                return field;
              }
            });

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
          const fields = property.fields!.map(field => {
            if (field.fieldName === '__typename') {
              const objectTypeName = getObjectTypeName(property.fieldType || property.type!);
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
        propertyDeclaration(generator, { ...property, isInput });
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
  const type = getNamedType(property.fieldType || property.type!);

  if (type instanceof GraphQLUnionType || type instanceof GraphQLInterfaceType) {
    return generator.context.schema.getPossibleTypes(type).map(type => type.name);
  }

  return [];
}

export function printDocComment(generator: CodeGenerator, description?: string, depth: number = 0): void {
  if (!description) {
    return;
  }

  const leadingSpace = ' '.repeat(2 * depth);

  generator.printOnNewline(`${leadingSpace}/**`);
  description.split('\n')
    .forEach(line => {
      generator.printOnNewline(`${leadingSpace} * ${line.trim()}`);
    });
  generator.printOnNewline(`${leadingSpace} */`);
}
