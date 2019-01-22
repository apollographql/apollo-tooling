import chalk from "chalk";

import {
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLType,
  isScalarType,
  isObjectType,
  isInterfaceType,
  isUnionType,
  isEnumType,
  isInputObjectType,
  isListType,
  isNamedType,
  isNonNullType,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  EnumTypeDefinitionNode
} from "graphql";

import {
  TypeMap,
  ChangeType,
  Change,
  DiffField,
  DiffInputValue,
  DiffEnum
} from "./ast";
import {
  ValidationResult,
  ValidationErrorType
} from "apollo-language-server/lib/engine/operations/validateOperations";

export * from "./ast";

// how its brought down from schema
export interface SchemaChange {
  type: ChangeType;
  code: string;
  description: string;
}

export function format({ type, description }: ValidationResult, index: number) {
  let color = (x: string) => x;
  switch (type) {
    case ValidationErrorType.FAILURE:
      color = chalk.red;
      break;
    case ValidationErrorType.INVALID:
      color = chalk.gray;
      break;
    case ValidationErrorType.WARNING:
      color = chalk.yellow;
      break;
  }
  return `    [${index}] ${color(type)}    ${description}`;
}

// A lot / most of this code is lifted from non exported members of graphql-js
// really amazing work in there

function isChangeSafeForObjectOrInterfaceField(
  oldType: GraphQLType,
  newType: GraphQLType
): boolean {
  if (isNamedType(oldType)) {
    return (
      // if they're both named types, see if their names are equivalent
      (isNamedType(newType) && oldType.name === newType.name) ||
      // moving from nullable to non-null of the same underlying type is safe
      (isNonNullType(newType) &&
        isChangeSafeForObjectOrInterfaceField(oldType, newType.ofType))
    );
  } else if (isListType(oldType)) {
    return (
      // if they're both lists, make sure the underlying types are compatible
      (isListType(newType) &&
        isChangeSafeForObjectOrInterfaceField(
          oldType.ofType,
          newType.ofType
        )) ||
      // moving from nullable to non-null of the same underlying type is safe
      (isNonNullType(newType) &&
        isChangeSafeForObjectOrInterfaceField(oldType, newType.ofType))
    );
  } else if (isNonNullType(oldType)) {
    // if they're both non-null, make sure the underlying types are compatible
    return (
      isNonNullType(newType) &&
      isChangeSafeForObjectOrInterfaceField(
        (oldType as any).ofType,
        newType.ofType
      )
    );
  }
  return false;
}

function isChangeSafeForInputObjectFieldOrFieldArg(
  oldType: GraphQLType,
  newType: GraphQLType
): boolean {
  if (isNamedType(oldType)) {
    // if they're both named types, see if their names are equivalent
    return isNamedType(newType) && oldType.name === newType.name;
  } else if (isListType(oldType)) {
    // if they're both lists, make sure the underlying types are compatible
    return (
      isListType(newType) &&
      isChangeSafeForInputObjectFieldOrFieldArg(oldType.ofType, newType.ofType)
    );
  } else if (isNonNullType(oldType)) {
    return (
      // if they're both non-null, make sure the underlying types are
      // compatible
      (isNonNullType(newType) &&
        isChangeSafeForInputObjectFieldOrFieldArg(
          (oldType as any).ofType,
          newType.ofType
        )) ||
      // moving from non-null to nullable of the same underlying type is safe
      (!isNonNullType(newType) &&
        isChangeSafeForInputObjectFieldOrFieldArg(
          (oldType as any).ofType,
          newType
        ))
    );
  }
  return false;
}

function typeKindName(type: GraphQLNamedType): string {
  if (isScalarType(type)) {
    return "a Scalar type";
  }
  if (isObjectType(type)) {
    return "an Object type";
  }
  if (isInterfaceType(type)) {
    return "an Interface type";
  }
  if (isUnionType(type)) {
    return "a Union type";
  }
  if (isEnumType(type)) {
    return "an Enum type";
  }
  if (isInputObjectType(type)) {
    return "an Input type";
  }
  throw new TypeError("Unknown type " + type!.constructor.name);
}

const m = (text: any): string => "`" + text + "`";

// we use error throwing for control flow here
const diffTypesLeft = (
  type: GraphQLNamedType,
  next: TypeMap,
  changes: Change[]
) => {
  // if we have removed this type we can early exit since thats the
  // most critical information
  if (!next[type.name]) {
    const change = {
      change: ChangeType.WARNING,
      code: "TYPE_REMOVED",
      description: `${m(type)} removed`,
      type: type.astNode
    };
    changes.push(change);

    // XXX what happens if we don't have an astNode?
    if (!type.astNode) return;
    throw true;
  }

  const oldType = type;
  const newType = next[type.name];

  /* Object Types */
  if (isObjectType(oldType) && isObjectType(newType)) {
    /* Interface diffing */
    const oldInterfaces = oldType.getInterfaces();
    const newInterfaces = newType.getInterfaces();
    oldInterfaces.forEach(oldInterface => {
      if (!newInterfaces.some(int => int.name === oldInterface.name)) {
        const change = {
          change: ChangeType.WARNING,
          code: "INTERFACE_REMOVED_FROM_OBJECT",
          description: `${m(type.name)} no longer implements interface ${m(
            oldInterface.name
          )}`,
          type: newType.astNode
        };
        changes.push(change);
      }
    });
  }

  /* unions */
  if (isUnionType(oldType) && isUnionType(newType)) {
    const typeNamesInNewUnion = Object.create(null);
    newType.getTypes().forEach(type => {
      typeNamesInNewUnion[type.name] = true;
    });
    oldType.getTypes().forEach(type => {
      if (!typeNamesInNewUnion[type.name]) {
        const change = {
          change: ChangeType.WARNING,
          code: "TYPE_REMOVED_FROM_UNION",
          description: `${m(type.name)} was removed from union type ${m(
            oldType.name
          )}.`,
          type: newType.astNode
        };
        changes.push(change);
      }
    });
  }
};

// within this can we assume no parent type change?
const diffFieldsLeft = (
  oldType: GraphQLNamedType,
  newType: GraphQLNamedType,
  changes: Change[]
) => {
  /* ENUM */
  if (isEnumType(oldType) && isEnumType(newType)) {
    const valuesInNewEnum = Object.create(null);
    newType.getValues().forEach(value => {
      valuesInNewEnum[value.name] = true;
    });
    oldType.getValues().forEach(value => {
      if (!valuesInNewEnum[value.name]) {
        const change = {
          change: ChangeType.WARNING,
          code: "ENUM_VALUE_REMOVED",
          description: `${m(value.name)} was removed from enum type ${m(
            newType
          )}.`,
          type: newType.astNode,
          field: value.astNode
        };
        changes.push(change);
        const t = change.type as EnumTypeDefinitionNode;
        if (!t || !Array.isArray(t.values)) return;

        const valueDef = t.values.find(
          ({ name }) => name.value === value.name
        ) as DiffEnum;

        if (!valueDef) {
          t.values.push({ ...value.astNode, change });
        } else {
          valueDef.change = change;
        }
      }
    });
  }
  /* FIELDS */
  if (
    isObjectType(oldType) ||
    (isInterfaceType(oldType) &&
      (isObjectType(newType) || isInterfaceType(newType)))
  ) {
    const oldTypeFieldsDef = oldType.getFields();
    // XXX this could be an input object or regular object
    const newTypeFieldsDef = (newType as GraphQLObjectType).getFields();
    Object.keys(oldTypeFieldsDef).forEach(fieldName => {
      // Check if the field is missing on the type in the new schema.
      if (!(fieldName in newTypeFieldsDef)) {
        const change = {
          change: ChangeType.WARNING,
          code: "FIELD_REMOVED",
          description: `${m(`${newType}.${fieldName}`)} was removed`,
          type: newType.astNode,
          field: oldTypeFieldsDef[fieldName].astNode
        };
        changes.push(change);
        const t = change.type as ObjectTypeDefinitionNode;
        if (!t || !Array.isArray(t.fields)) return;

        const fieldDef = t.fields.find(
          ({ name }) => name.value === fieldName
        ) as DiffField;

        if (!fieldDef) {
          t.fields.push({ ...oldTypeFieldsDef[fieldName].astNode, change });
        } else {
          fieldDef.change = change;
        }
        // if you removed the field, what you did with the arguments don't matter
        return;
      }

      const oldFieldType = oldTypeFieldsDef[fieldName].type;
      const newFieldType = newTypeFieldsDef[fieldName].type;
      const isSafe = isChangeSafeForObjectOrInterfaceField(
        oldFieldType,
        newFieldType
      );
      if (!isSafe) {
        const oldFieldTypeString = isNamedType(oldFieldType)
          ? oldFieldType.name
          : oldFieldType.toString();
        const newFieldTypeString = isNamedType(newFieldType)
          ? newFieldType.name
          : newFieldType.toString();

        const change = {
          code: "FIELD_CHANGED_KIND",
          description:
            `${m(`${newType.name}.${fieldName}`)} changed type from ` +
            `${m(oldFieldTypeString)} to ${m(newFieldTypeString)}.`,
          change: ChangeType.WARNING,
          type: newType.astNode,
          field: newTypeFieldsDef[fieldName].astNode
        };
        changes.push(change);
        const t = change.type as ObjectTypeDefinitionNode;
        if (!t || !Array.isArray(t.fields)) return;

        const fieldDef = t.fields.find(
          ({ name }) => name.value === fieldName
        ) as DiffField;

        if (!fieldDef) {
          t.fields.push({ ...oldTypeFieldsDef[fieldName].astNode, change });
        } else {
          fieldDef.change = change;
        }
      }

      oldTypeFieldsDef[fieldName].args.forEach(oldArgDef => {
        const newArgs = newTypeFieldsDef[fieldName].args;
        const newArgDef = newArgs.find(arg => arg.name === oldArgDef.name);

        // Arg not present
        if (!newArgDef) {
          const change = {
            change: ChangeType.WARNING,
            code: "ARG_REMOVED",
            description: `${m(`${oldType}.${fieldName}`)} arg ${m(
              oldArgDef.name
            )} was removed`,
            type: newType.astNode,
            field: newTypeFieldsDef[fieldName].astNode,
            arg: oldArgDef.astNode
          };

          changes.push(change);

          const t = change.type as ObjectTypeDefinitionNode;
          if (!t || !Array.isArray(t.fields)) return;

          const fieldDef = t.fields.find(
            ({ name }) => name.value === fieldName
          ) as DiffField;

          if (!fieldDef) {
            t.fields.push({ ...oldTypeFieldsDef[fieldName].astNode, change });
          } else {
            fieldDef.change = change;
          }
        } else {
          const isSafe = isChangeSafeForInputObjectFieldOrFieldArg(
            oldArgDef.type,
            newArgDef.type
          );
          let change;
          if (!isSafe) {
            change = {
              code: "ARG_CHANGED_KIND",
              change: ChangeType.WARNING,
              description:
                `${m(`${oldType.name}.${fieldName}`)} arg ` +
                `${m(oldArgDef.name)} has changed type from ` +
                `${m(oldArgDef.type)} to ${m(newArgDef.type)}`,
              type: newType.astNode,
              field: newTypeFieldsDef[fieldName].astNode,
              arg: oldArgDef.astNode
            };
          } else if (
            oldArgDef.defaultValue !== undefined &&
            oldArgDef.defaultValue !== newArgDef.defaultValue
          ) {
            change = {
              code: "ARG_DEFAULT_VALUE_CHANGE",
              change: ChangeType.WARNING,
              description:
                `${m(`${oldType.name}.${fieldName}`)} arg ` +
                `${m(oldArgDef.name)} has changed defaultValue`,
              type: newType.astNode,
              field: newTypeFieldsDef[fieldName].astNode,
              arg: oldArgDef.astNode
            };
          }
          if (!change) return;
          changes.push(change);

          const t = change.type as ObjectTypeDefinitionNode;
          if (!t || !Array.isArray(t.fields)) return;

          const fieldDef = t.fields.find(
            ({ name }) => name.value === fieldName
          ) as DiffField;

          fieldDef.change = change;
        }
      });
    });
  }

  /* InputObjects */
  if (isInputObjectType(oldType) && isInputObjectType(newType)) {
    const oldTypeFieldsDef = oldType.getFields();
    const newTypeFieldsDef = newType.getFields();
    Object.keys(oldTypeFieldsDef).forEach(fieldName => {
      if (!(fieldName in newTypeFieldsDef)) {
        const change = {
          change: ChangeType.WARNING,
          code: "INPUT_FIELD_REMOVED",
          description: `${m(`${newType}.${fieldName}`)} was removed`,
          type: newType.astNode,
          field: oldTypeFieldsDef[fieldName].astNode
        };

        changes.push(change);

        const t = change.type as InputObjectTypeDefinitionNode;
        if (!t || !Array.isArray(t.fields)) return;

        const fieldDef = t.fields.find(
          ({ name }) => name.value === fieldName
        ) as DiffField;
        if (!fieldDef) {
          t.fields.push({ ...oldTypeFieldsDef[fieldName].astNode, change });
        } else {
          fieldDef.change = change;
        }
      }

      if (!newTypeFieldsDef[fieldName]) return;

      const oldFieldType = oldTypeFieldsDef[fieldName].type;
      const newFieldType = newTypeFieldsDef[fieldName].type;

      const isSafe = isChangeSafeForInputObjectFieldOrFieldArg(
        oldFieldType,
        newFieldType
      );
      if (!isSafe) {
        const oldFieldTypeString = isNamedType(oldFieldType)
          ? oldFieldType.name
          : oldFieldType.toString();
        const newFieldTypeString = isNamedType(newFieldType)
          ? newFieldType.name
          : newFieldType.toString();
        const change = {
          code: "FIELD_CHANGED_KIND",
          description:
            `${m(`${newType.name}.${fieldName}`)} changed type from ` +
            `${m(oldFieldTypeString)} to ${m(newFieldTypeString)}.`,
          change: ChangeType.WARNING,
          type: newType.astNode,
          field: newTypeFieldsDef[fieldName].astNode
        };
        changes.push(change);
        const t = change.type as InputObjectTypeDefinitionNode;
        if (!t || !Array.isArray(t.fields)) return;

        const fieldDef = t.fields.find(
          ({ name }) => name.value === fieldName
        ) as DiffField;

        if (!fieldDef) {
          t.fields.push({ ...oldTypeFieldsDef[fieldName].astNode, change });
        } else {
          fieldDef.change = change;
        }
      }
    });
  }
};

const diffTypesRight = (
  type: GraphQLNamedType,
  current: TypeMap,
  changes: Change[]
) => {
  // if we have a new type we can early exit since thats the
  // most critical information
  const oldType = current[type.name];
  if (!oldType) {
    const change = {
      change: ChangeType.NOTICE,
      code: "TYPE_ADDED",
      description: `${m(type)} added`,
      type: type.astNode
    };
    changes.push(change);
    // change.type.change = change;
    throw true;
  }
  const newType = type;

  if (oldType.constructor !== newType.constructor) {
    const change = {
      change: ChangeType.WARNING,
      code: "TYPE_CHANGED_KIND",
      description:
        `${m(type.name)} changed from ` +
        `${typeKindName(oldType)} to ${typeKindName(newType)}.`,
      type: newType.astNode
    };
    changes.push(change);
  }

  /* Object Types */
  if (isObjectType(oldType) && isObjectType(newType)) {
    /* Interface diffing */
    const oldInterfaces = oldType.getInterfaces();
    const newInterfaces = newType.getInterfaces();
    newInterfaces.forEach(newInterface => {
      if (!oldInterfaces.some(int => int.name === newInterface.name)) {
        const change = {
          change: ChangeType.WARNING,
          code: "INTERFACE_ADDED_TO_OBJECT",
          description: `${m(newInterface.name)} was added to type ${m(
            newType.name
          )}`,
          type: newType.astNode
        };
        changes.push(change);
      }
    });
  }

  if (isUnionType(oldType) && isUnionType(newType)) {
    const typeNamesInOldUnion = Object.create(null);
    oldType.getTypes().forEach(type => {
      typeNamesInOldUnion[type.name] = true;
    });
    newType.getTypes().forEach(type => {
      if (!typeNamesInOldUnion[type.name]) {
        const change = {
          change: ChangeType.WARNING,
          code: "TYPE_ADDED_TO_UNION",
          description: `${m(type.name)} was added to union type ${m(
            oldType.name
          )}.`,
          type: newType.astNode
        };
        changes.push(change);
      }
    });
  }
};

// within this can we assume no parent type change?
const diffFieldsRight = (
  oldType: GraphQLNamedType,
  newType: GraphQLNamedType,
  changes: Change[]
) => {
  /* ENUM */
  if (isEnumType(oldType) && isEnumType(newType)) {
    const valuesInOldEnum = Object.create(null);
    oldType.getValues().forEach(value => {
      valuesInOldEnum[value.name] = true;
    });
    newType.getValues().forEach(value => {
      if (!valuesInOldEnum[value.name]) {
        const change = {
          change: ChangeType.NOTICE,
          code: "ENUM_VALUE_ADDED",
          description: `${m(value.name)} was added to enum type ${m(newType)}.`,
          type: newType.astNode,
          field: value.astNode
        };
        changes.push(change);
        const t = change.type as EnumTypeDefinitionNode;
        if (!t || !Array.isArray(t.values)) return;
        const valueDef = t.values.find(
          ({ name }) => name.value === value.name
        ) as DiffEnum;
        if (valueDef) valueDef.change = change;
      }

      let change;
      const oldValue = oldType.getValue(value.name);
      if (!oldValue) return;
      if (!oldValue.isDeprecated && value.isDeprecated) {
        change = {
          change: ChangeType.WARNING,
          code: "ENUM_DEPRECATED",
          description: `${m(`${newType}.${value.name}`)} was deprecated`,
          type: newType.astNode,
          field: oldValue.astNode
        };
      } else if (oldValue.isDeprecated && !value.isDeprecated) {
        change = {
          change: ChangeType.NOTICE,
          code: "ENUM_DEPRECATION_REMOVED",
          description: `${m(
            `${newType}.${value.name}`
          )} is no longer deprecated`,
          type: newType.astNode,
          field: oldValue.astNode
        };
      } else if (
        oldValue.isDeprecated &&
        value.isDeprecated &&
        oldValue.deprecationReason !== value.deprecationReason
      ) {
        change = {
          change: ChangeType.NOTICE,
          code: "ENUM_DEPRECATED_REASON_CHANGE",
          description: `${m(
            `${newType}.${value.name}`
          )} deprecation reason changed`,
          type: newType.astNode,
          field: oldValue.astNode
        };
      }
      if (!change) return;
      changes.push(change);
      const t = change.type as EnumTypeDefinitionNode;
      if (!t || !Array.isArray(t.values)) return;
      const valueDef = t.values.find(
        ({ name }) => name.value === value.name
      ) as DiffEnum;
      if (valueDef) valueDef.change = change;
    });
  }
  /* FIELDS */
  if (
    isObjectType(oldType) ||
    (isInterfaceType(oldType) &&
      (isObjectType(newType) || isInterfaceType(newType)))
  ) {
    const oldTypeFieldsDef = oldType.getFields();
    // XXX this could be GraphQLObjectType or GraphQLInterfaceType
    const newTypeFieldsDef = (newType as GraphQLObjectType).getFields();
    Object.keys(newTypeFieldsDef).forEach(fieldName => {
      // Check if the field is missing on the type in the old schema.
      if (!(fieldName in oldTypeFieldsDef)) {
        const change = {
          change: ChangeType.NOTICE,
          code: "FIELD_ADDED",
          description: `${m(`${newType}.${fieldName}`)} was added`,
          type: newType.astNode,
          field: newTypeFieldsDef[fieldName].astNode
        };
        changes.push(change);
        const t = change.type as ObjectTypeDefinitionNode;
        if (!t || !Array.isArray(t.fields)) return;
        const fieldDef = t.fields.find(
          ({ name }) => name.value === fieldName
        ) as DiffField;
        if (fieldDef) fieldDef.change = change;
        return;
      }

      let change;
      if (
        !oldTypeFieldsDef[fieldName].isDeprecated &&
        newTypeFieldsDef[fieldName].isDeprecated
      ) {
        change = {
          change: ChangeType.WARNING,
          code: "FIELD_DEPRECATED",
          description: `${m(`${newType}.${fieldName}`)} was deprecated`,
          type: newType.astNode,
          field: newTypeFieldsDef[fieldName].astNode
        };
      } else if (
        oldTypeFieldsDef[fieldName].isDeprecated &&
        !newTypeFieldsDef[fieldName].isDeprecated
      ) {
        change = {
          change: ChangeType.NOTICE,
          code: "FIELD_DEPRECATION_REMOVED",
          description: `${m(
            `${newType}.${fieldName}`
          )} is no longer deprecated`,
          type: newType.astNode,
          field: newTypeFieldsDef[fieldName].astNode
        };
      } else if (
        oldTypeFieldsDef[fieldName].isDeprecated &&
        newTypeFieldsDef[fieldName].isDeprecated &&
        oldTypeFieldsDef[fieldName].deprecationReason !==
          newTypeFieldsDef[fieldName].deprecationReason
      ) {
        change = {
          change: ChangeType.NOTICE,
          code: "FIELD_DEPRECATED_REASON_CHANGE",
          description: `${m(
            `${newType}.${fieldName}`
          )} deprecation reason changed`,
          type: newType.astNode
        };
      }
      if (change) {
        changes.push(change);
        const t = change.type as ObjectTypeDefinitionNode;
        if (!t || !Array.isArray(t.fields)) return;
        const fieldDef = t.fields.find(
          ({ name }) => name.value === fieldName
        ) as DiffField;
        if (fieldDef) fieldDef.change = change;
      }

      newTypeFieldsDef[fieldName].args.forEach(newArgDef => {
        const oldArgs = oldTypeFieldsDef[fieldName].args;
        const oldArgDef = oldArgs.find(arg => arg.name === newArgDef.name);

        // Arg not present in old schema
        if (!oldArgDef) {
          const change = {
            change: ChangeType.NOTICE,
            code: "ARG_ADDED",
            description: `${m(`${oldType}.${fieldName}`)} arg ${m(
              newArgDef.name
            )} was added`,
            type: newType.astNode,
            field: newTypeFieldsDef[fieldName].astNode,
            arg: newArgDef.astNode
          };

          changes.push(change);

          const t = change.type as ObjectTypeDefinitionNode;
          if (!t || !Array.isArray(t.fields)) return;

          const fieldDef = t.fields.find(
            ({ name }) => name.value === fieldName
          ) as DiffField;

          fieldDef.change = change;
        }
      });
    });
  }

  /* InputObjects */
  if (isInputObjectType(oldType) && isInputObjectType(newType)) {
    const oldTypeFieldsDef = oldType.getFields();
    const newTypeFieldsDef = newType.getFields();
    Object.keys(newTypeFieldsDef).forEach(fieldName => {
      if (!(fieldName in oldTypeFieldsDef)) {
        let change;

        if (isNonNullType(newTypeFieldsDef[fieldName].type)) {
          change = {
            change: ChangeType.WARNING,
            code: "NON_NULL_INPUT_FIELD_ADDED",
            description: `A non-null field ${m(fieldName)} on input type ${m(
              newType.name
            )} was added.`,
            type: newType.astNode
          };
        } else {
          change = {
            change: ChangeType.NOTICE,
            code: "NULLABLE_INPUT_FIELD_ADDED",
            description: `A nullable field ${m(fieldName)} on input type ${m(
              newType.name
            )} was added.`,
            type: newType.astNode,
            field: newTypeFieldsDef[fieldName].astNode
          };
        }

        changes.push(change);

        const t = change.type as InputObjectTypeDefinitionNode;
        // XXX fields can be undefined here?
        const fieldDef = Boolean(t && Array.isArray(t.fields))
          ? t.fields!.find(({ name }) => name.value === fieldName)
          : undefined;
        if (fieldDef) (fieldDef as DiffInputValue).change = change;
        // if field is new then just register that as the change
        return;
      }
    });
  }
};

const diffLeft = (current: TypeMap, next: TypeMap, changes: Change[]) => {
  // current => next
  Object.keys(current).forEach(typeName => {
    const oldType = current[typeName];
    const newType = next[typeName];
    try {
      diffTypesLeft(oldType, next, changes);
      diffFieldsLeft(current[typeName], newType, changes);
    } catch (r) {
      if (r instanceof Error) throw r;
    }
  });
};

const diffRight = (next: TypeMap, current: TypeMap, changes: Change[]) => {
  Object.keys(next).forEach(typeName => {
    const newType = next[typeName];
    // XXX what happens if we don't have an astNode?
    if (!newType.astNode) return;

    try {
      diffTypesRight(newType, current, changes);
      diffFieldsRight(current[typeName], newType, changes);
    } catch (r) {
      if (r instanceof Error) throw r;
    }
  });
};

export const diffSchemas = (current: TypeMap, next: TypeMap): Change[] => {
  // sink for types and changes
  const changes: Change[] = [];

  diffRight(next, current, changes);
  diffLeft(current, next, changes);

  return changes.sort(sorter);
};

const sorter = (a: Change, b: Change) => {
  if (a.change === b.change) return 0;
  if (b.change === ChangeType.FAILURE) return 1;
  if (b.change === ChangeType.WARNING) return 1;
  if (b.change === ChangeType.NOTICE) return -1;
  return 0;
};
