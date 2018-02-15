import {
  visit,
  Kind,
  isEqualType,
  isAbstractType,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  GraphQLNamedType,
  GraphQLCompositeType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLEnumValue,
  GraphQLError,
  GraphQLSchema,
  GraphQLType,
  GraphQLScalarType,
  ASTNode,
  Location,
  ValueNode,
  OperationDefinitionNode,
  SelectionSetNode,
  FieldNode,
  GraphQLField,
  GraphQLList,
  GraphQLNonNull,
  DocumentNode
} from 'graphql';

declare module "graphql" {
  function isNamedType(type: GraphQLType): type is GraphQLNamedType;
  const specifiedScalarTypes: GraphQLScalarType[];
  function isSpecifiedScalarType(type: GraphQLType): boolean;
  const introspectionTypes: GraphQLNamedType[];
  function isIntrospectionType(type: GraphQLType): boolean;
  function validateSchema(schema: GraphQLSchema): GraphQLError[];
}

declare module "graphql/utilities/buildASTSchema" {
  function buildASTSchema(
    ast: DocumentNode,
    options?: { assumeValid?: boolean, commentDescriptions?: boolean },
  ): GraphQLSchema;
}

export function sortEnumValues(values: GraphQLEnumValue[]): GraphQLEnumValue[] {
  return values.sort((a, b) => a.value < b.value ? -1 : a.value > b.value ? 1 : 0);
}

export function isList(type: GraphQLType): boolean {
  return type instanceof GraphQLList || (type instanceof GraphQLNonNull && type.ofType instanceof GraphQLList);
}

export function isMetaFieldName(name: string) {
  return name.startsWith('__');
}

const typenameField = { kind: Kind.FIELD, name: { kind: Kind.NAME, value: '__typename' } };

export function withTypenameFieldAddedWhereNeeded(ast: ASTNode) {
  return visit(ast, {
    enter: {
      SelectionSet(node: SelectionSetNode) {
        return {
          ...node,
          selections: node.selections.filter(
            selection => !(selection.kind === 'Field' && (selection as FieldNode).name.value === '__typename')
          )
        };
      }
    },
    leave(node: ASTNode) {
      if (!(node.kind === 'Field' || node.kind === 'FragmentDefinition')) return undefined;
      if (!node.selectionSet) return undefined;

      if (true) {
        return {
          ...node,
          selectionSet: {
            ...node.selectionSet,
            selections: [typenameField, ...node.selectionSet.selections]
          }
        };
      } else {
        return undefined;
      }
    }
  });
}

export function sourceAt(location: Location) {
  return location.source.body.slice(location.start, location.end);
}

export function filePathForNode(node: ASTNode): string  {
  const name = node.loc && node.loc.source && node.loc.source.name;
  if (!name || name === "GraphQL") {
    throw new Error("Node does not seem to have a file path");
  }
  return name;
}

export function valueFromValueNode(valueNode: ValueNode): any | { kind: 'Variable', variableName: string } {
  switch (valueNode.kind) {
    case 'IntValue':
    case 'FloatValue':
      return Number(valueNode.value);
    case 'NullValue':
      return null;
    case 'ListValue':
      return valueNode.values.map(valueFromValueNode);
    case 'ObjectValue':
      return valueNode.fields.reduce((object, field) => {
        object[field.name.value] = valueFromValueNode(field.value);
        return object;
      }, {} as any);
    case 'Variable':
      return { kind: 'Variable', variableName: valueNode.name.value };
    default:
      return valueNode.value;
  }
}

export function isTypeProperSuperTypeOf(schema: GraphQLSchema, maybeSuperType: GraphQLCompositeType, subType: GraphQLCompositeType) {
  return isEqualType(maybeSuperType, subType) || subType instanceof GraphQLObjectType && (isAbstractType(maybeSuperType) && schema.isPossibleType(maybeSuperType, subType));
}

// Utility functions extracted from graphql-js

/**
 * Extracts the root type of the operation from the schema.
 */
export function getOperationRootType(schema: GraphQLSchema, operation: OperationDefinitionNode) {
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
export function getFieldDef(schema: GraphQLSchema, parentType: GraphQLCompositeType, fieldAST: FieldNode): GraphQLField<any, any> | undefined {
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

  return undefined;
}
