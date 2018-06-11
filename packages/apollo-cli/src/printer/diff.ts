import {
  GraphQLSchema,
  GraphQLNamedType,
  GraphQLObjectType,
  GraphQLType,
  astFromValue,
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
  EnumTypeDefinitionNode,
  UnionTypeDefinitionNode
} from "graphql";

import {
  TypeMap,
  ChangeType,
  TypeKind,
  Change,
  DiffTypeMap,
  DiffType,
  DiffField,
  DiffInputValue,
  DiffEnum
} from "./ast";

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

const getKind = (type: GraphQLNamedType) => {
  if (isScalarType(type)) {
    return TypeKind.SCALAR;
  } else if (isObjectType(type)) {
    return TypeKind.OBJECT;
  } else if (isInterfaceType(type)) {
    return TypeKind.INTERFACE;
  } else if (isUnionType(type)) {
    return TypeKind.UNION;
  } else if (isEnumType(type)) {
    return TypeKind.ENUM;
  } else if (isInputObjectType(type)) {
    return TypeKind.INPUT_OBJECT;
  } else if (isListType(type)) {
    return TypeKind.LIST;
  } else if (isNonNullType(type)) {
    return TypeKind.NON_NULL;
  }
  throw new Error("Unknown kind of type: " + type);
};

// we use error throwing for control flow here
const diffTypesLeft = (
  type: GraphQLNamedType,
  current: TypeMap,
  next: TypeMap,
  changes: Change[]
) => {
  // if we have removed this type we can early exit since thats the
  // most critical information
  if (!next[type.name]) {
    const change = {
      change: ChangeType.WARNING,
      code: "TYPE_REMOVED",
      description: `${type} removed`,
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
          description: `${type.name} no longer implements interface ${
            oldInterface.name
          }`,
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
          description: `${type.name} was removed from union type ${
            oldType.name
          }.`,
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
          description: `${value.name} was removed from enum type ${newType}.`,
          type: newType.astNode
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
          description: `${newType}.${fieldName} was removed`,
          type: newType.astNode
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
            `${newType.name}.${fieldName} changed type from ` +
            `${oldFieldTypeString} to ${newFieldTypeString}.`,
          change: ChangeType.WARNING,
          type: newType.astNode
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
            description: `${oldType}.${fieldName} arg ${
              oldArgDef.name
            } was removed`,
            type: newType.astNode
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
                `${oldType.name}.${fieldName} arg ` +
                `${oldArgDef.name} has changed type from ` +
                `${oldArgDef.type.toString()} to ${newArgDef.type.toString()}`,
              type: newType.astNode
            };
          } else if (
            oldArgDef.defaultValue !== undefined &&
            oldArgDef.defaultValue !== newArgDef.defaultValue
          ) {
            change = {
              code: "ARG_DEFAULT_VALUE_CHANGE",
              change: ChangeType.WARNING,
              description:
                `${oldType.name}.${fieldName} arg ` +
                `${oldArgDef.name} has changed defaultValue`,
              type: newType.astNode
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
          description: `${newType}.${fieldName} was removed`,
          type: newType.astNode
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
            `${newType.name}.${fieldName} changed type from ` +
            `${oldFieldTypeString} to ${newFieldTypeString}.`,
          change: ChangeType.WARNING,
          type: newType.astNode
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
  next: TypeMap,
  changes: Change[]
) => {
  // if we have a new type we can early exit since thats the
  // most critical information
  const oldType = current[type.name];
  if (!oldType) {
    const change = {
      change: ChangeType.NOTICE,
      code: "TYPE_ADDED",
      description: `${type} added`,
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
        `${type.name} changed from ` +
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
          description: `${newInterface.name} was added to type ${newType.name}`,
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
          description: `${type.name} was added to union type ${oldType.name}.`,
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
          description: `${value.name} was added to enum type ${newType}.`,
          type: newType.astNode
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
          description: `${newType}.${value.name} was deprecated`,
          type: newType.astNode
        };
      } else if (oldValue.isDeprecated && !value.isDeprecated) {
        change = {
          change: ChangeType.NOTICE,
          code: "ENUM_DEPRECATION_REMOVED",
          description: `${newType}.${value.name} is no longer deprecated`,
          type: newType.astNode
        };
      } else if (
        oldValue.isDeprecated &&
        value.isDeprecated &&
        oldValue.deprecationReason !== value.deprecationReason
      ) {
        change = {
          change: ChangeType.NOTICE,
          code: "ENUM_DEPRECATED_REASON_CHANGE",
          description: `${newType}.${value.name} deprecation reason changed`,
          type: newType.astNode
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
          description: `${newType}.${fieldName} was added`,
          type: newType.astNode
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
          description: `${newType}.${fieldName} was deprecated`,
          type: newType.astNode
        };
      } else if (
        oldTypeFieldsDef[fieldName].isDeprecated &&
        !newTypeFieldsDef[fieldName].isDeprecated
      ) {
        change = {
          change: ChangeType.NOTICE,
          code: "FIELD_DEPRECATION_REMOVED",
          description: `${newType}.${fieldName} is no longer deprecated`,
          type: newType.astNode
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
          description: `${newType}.${fieldName} deprecation reason changed`,
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
            description: `${oldType}.${fieldName} arg ${
              newArgDef.name
            } was added`,
            type: newType.astNode
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
            description:
              `A non-null field ${fieldName} on ` +
              `input type ${newType.name} was added.`,
            type: newType.astNode
          };
        } else {
          change = {
            change: ChangeType.NOTICE,
            code: "NULLABLE_INPUT_FIELD_ADDED",
            description:
              `A nullable field ${fieldName} on ` +
              `input type ${newType.name} was added.`,
            type: newType.astNode
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
      diffTypesLeft(oldType, current, next, changes);
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
      diffTypesRight(newType, current, next, changes);
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
  if (a.type === b.type) return 0;
  if (b.type === ChangeType.FAILURE) return 1;
  if (b.type === ChangeType.WARNING) return 1;
  if (b.type === ChangeType.NOTICE) return -1;
  return 0;
};
