import {
  visit,
  visitWithTypeInfo,
  Kind,
  TypeInfo,
  isEqualType,
  isTypeSubTypeOf,
  isAbstractType,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumType,
  GraphQLString,
  GraphQLInt,
  GraphQLFloat,
  GraphQLBoolean,
  GraphQLID,
  GraphQLError
} from 'graphql';

const builtInScalarTypes = new Set([GraphQLString, GraphQLInt, GraphQLFloat, GraphQLBoolean, GraphQLID]);

export function isBuiltInScalarType(type) {
  return builtInScalarTypes.has(type);
}

const typenameField = { kind: Kind.FIELD, name: { kind: Kind.NAME, value: '__typename' } };

export function withTypenameFieldAddedWhereNeeded(schema, ast) {
  function isOperationRootType(type) {
    return type === schema.getQueryType() ||
      type === schema.getMutationType() ||
      type === schema.getSubscriptionType();
  }

  const typeInfo = new TypeInfo(schema);

  return visit(ast, visitWithTypeInfo(typeInfo, {
    leave: {
      SelectionSet: node => {
        const parentType = typeInfo.getParentType();

        if (!isOperationRootType(parentType)) {
          return { ...node, selections: [typenameField, ...node.selections] };
        }
      }
    }
  }));
}

export function sourceAt(location) {
  return location.source.body.slice(location.start, location.end);
}

export function filePathForNode(node) {
  const name = node.loc.source && node.loc.source.name;
  return (name === "GraphQL") ? undefined : name;
}

export function valueFromValueNode(valueNode) {
  const kind = valueNode.kind;

  if (kind === 'IntValue' || kind === 'FloatValue') {
    return Number(valueNode.value);
  } else if (kind === 'NullValue') {
    return null;
  } else if (kind === 'ListValue') {
    return valueNode.values.map(valueFromValueNode);
  } else if (kind === 'ObjectValue') {
    return valueNode.fields.reduce((object, field) => {
      object[field.name.value] = valueFromValueNode(field.value);
      return object;
    }, {});
  } else if (kind === 'Variable') {
    return { kind, variableName: valueNode.name.value };
  } else {
    return valueNode.value;
  }
}

export function isTypeProperSuperTypeOf(schema, maybeSuperType, subType) {
  return isEqualType(maybeSuperType, subType) || (isAbstractType(maybeSuperType) && schema.isPossibleType(maybeSuperType, subType));
}

// Utility functions extracted from graphql-js

/**
 * Extracts the root type of the operation from the schema.
 */
export function getOperationRootType(schema, operation) {
  switch (operation.operation) {
    case 'query':
      return schema.getQueryType();
    case 'mutation':
      const mutationType = schema.getMutationType();
      if (!mutationType) {
        throw new GraphQLError(
          'Schema is not configured for mutations',
          [operation]
        );
      }
      return mutationType;
    case 'subscription':
      const subscriptionType = schema.getSubscriptionType();
      if (!subscriptionType) {
        throw new GraphQLError(
          'Schema is not configured for subscriptions',
          [operation]
        );
      }
      return subscriptionType;
    default:
      throw new GraphQLError(
        'Can only compile queries, mutations and subscriptions',
        [operation]
      );
  }
}

/**
 * Not exactly the same as the executor's definition of getFieldDef, in this
 * statically evaluated environment we do not always have an Object type,
 * and need to handle Interface and Union types.
 */
export function getFieldDef(schema, parentType, fieldAST) {
  const name = fieldAST.name.value;
  if (name === SchemaMetaFieldDef.name &&
      schema.getQueryType() === parentType) {
    return SchemaMetaFieldDef;
  }
  if (name === TypeMetaFieldDef.name &&
      schema.getQueryType() === parentType) {
    return TypeMetaFieldDef;
  }
  if (name === TypeNameMetaFieldDef.name &&
      (parentType instanceof GraphQLObjectType ||
       parentType instanceof GraphQLInterfaceType ||
       parentType instanceof GraphQLUnionType)
  ) {
    return TypeNameMetaFieldDef;
  }
  if (parentType instanceof GraphQLObjectType ||
      parentType instanceof GraphQLInterfaceType) {
    return parentType.getFields()[name];
  }
}
