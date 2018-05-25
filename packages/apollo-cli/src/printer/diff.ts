import {
  GraphQLSchema,
  TypeMap,
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
} from "graphql";
import { __ChangeType, __TypeKind } from "./ast";

const getKind = type => {
  if (isScalarType(type)) {
    return __TypeKind.SCALAR;
  } else if (isObjectType(type)) {
    return __TypeKind.OBJECT;
  } else if (isInterfaceType(type)) {
    return __TypeKind.INTERFACE;
  } else if (isUnionType(type)) {
    return __TypeKind.UNION;
  } else if (isEnumType(type)) {
    return __TypeKind.ENUM;
  } else if (isInputObjectType(type)) {
    return __TypeKind.INPUT_OBJECT;
  } else if (isListType(type)) {
    return __TypeKind.LIST;
  } else if (isNonNullType(type)) {
    return __TypeKind.NON_NULL;
  }
  throw new Error("Unknown kind of type: " + type);
};

// we use error throwing for control flow here
const diffTypesLeft = (type, current, next, diff) => {
  // if we have removed this type we can early exit since thats the
  // most critical information
  if (!next[type]) {
    const change = {
      change: __ChangeType.WARNING,
      code: "TYPE_REMOVED",
      message: `${type} removed`,
      type,
    };
    diff.changes.push(change);
    diff.types[type] = type.astNode;
    throw true;
  }
};

const diffLeft = (current, next, diff) => {
  // current => next
  Object.keys(current).forEach(typeName => {
    const type = current[typeName];
    try {
      diffTypesLeft(type, current, next, diff);
    } catch (r) {}
  });
};

const diffTypesRight = (type, current, next, diff) => {
  // if we have a new type we can early exit since thats the
  // most critical information
  const oldType = current[type];
  if (!oldType) {
    const change = {
      change: __ChangeType.NOTICE,
      code: "TYPE_ADDED",
      message: `${type} added`,
      type,
    };
    diff.changes.push(change);
    diff.types[type].changes = [change];
    throw true;
  }
};

// within this can we assume no parent type change?
const diffFieldsRight = (oldType, newType, diff) => {
  if (isEnumType(oldType) && isEnumType(newType)) {
    const valuesInOldEnum = Object.create(null);
    oldType.getValues().forEach(value => {
      valuesInOldEnum[value.name] = true;
    });
    newType.getValues().forEach(value => {
      if (!valuesInOldEnum[value.name]) {
        const change = {
          change: __ChangeType.NOTICE,
          code: "ENUM_VALUE_ADDED",
          description: `${value.name} was added to enum type ${newType}.`,
          type: newType,
        };
        diff.changes.push(change);
        const valueDef = diff.types[newType].values.find(
          ({ name }) => name.value === value.name
        );
        valueDef.change = change;
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
    const newTypeFieldsDef = newType.getFields();
    Object.keys(newTypeFieldsDef).forEach(fieldName => {
      // Check if the field is missing on the type in the old schema.
      if (!(fieldName in oldTypeFieldsDef)) {
        const change = {
          change: __ChangeType.NOTICE,
          code: "FIELD_ADDED",
          description: `${newType}.${fieldName} was added`,
          type: newType,
        };
        diff.changes.push(change);
        const fieldDef = diff.types[newType].fields.find(
          ({ name }) => name.value === fieldName
        );
        fieldDef.change = change;
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
            change: __ChangeType.WARNING,
            code: "NON_NULL_INPUT_FIELD_ADDED",
            description:
              `A non-null field ${fieldName} on ` +
              `input type ${newType.name} was added.`,
            type: newType,
          };
        } else {
          change = {
            change: __ChangeType.NOTICE,
            code: "NULLABLE_INPUT_FIELD_ADDED",
            description:
              `A nullable field ${fieldName} on ` +
              `input type ${newType.name} was added.`,
            type: newType,
          };
        }

        diff.changes.push(change);

        const fieldDef = diff.types[newType].fields.find(
          ({ name }) => name.value === fieldName
        );
        fieldDef.change = change;
      }
    });
  }
};

const diffRight = (next, current, diff) => {
  Object.keys(next).forEach(typeName => {
    const newType = next[typeName];
    diff.types[typeName] = newType.astNode;
    try {
      diffTypesRight(newType, current, next, diff);
      diffFieldsRight(current[typeName], newType, diff);
    } catch (r) {
      if (r instanceof Error) {
        throw new Error(r);
      }
      return;
    }
  });
};

export const diffSchemas = (current: TypeMap, next: TypeMap) => {
  // sink for types and changes
  const diff = {
    types: {},
    changes: [],
  };

  diffLeft(current, next, diff);
  diffRight(next, current, diff);

  return diff;
};
