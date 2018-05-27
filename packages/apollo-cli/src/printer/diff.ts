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
      }
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

  return changes;
};
