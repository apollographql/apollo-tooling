import {
  GraphQLSchema,
  GraphQLCompositeType,
  GraphQLObjectType,
  GraphQLInterfaceType,
  GraphQLUnionType,
  GraphQLField,
  FieldNode,
  SchemaMetaFieldDef,
  TypeMetaFieldDef,
  TypeNameMetaFieldDef,
  ASTNode,
  Kind,
  NameNode,
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode
} from "graphql";

export function isNode(maybeNode: any): maybeNode is ASTNode {
  return maybeNode && typeof maybeNode.kind === "string";
}

export type NamedNode = ASTNode & {
  name: NameNode;
};

export function isNamedNode(node: ASTNode): node is NamedNode {
  return "name" in node;
}

export function isTypeSystemDefinitionNode(
  node: ASTNode
): node is TypeSystemDefinitionNode {
  switch (node.kind) {
    case Kind.SCHEMA_DEFINITION:
    case Kind.SCALAR_TYPE_DEFINITION:
    case Kind.OBJECT_TYPE_DEFINITION:
    case Kind.INTERFACE_TYPE_DEFINITION:
    case Kind.UNION_TYPE_DEFINITION:
    case Kind.ENUM_TYPE_DEFINITION:
    case Kind.INPUT_OBJECT_TYPE_DEFINITION:
    case Kind.DIRECTIVE_DEFINITION:
      return true;
    default:
      return false;
  }
}

export function isTypeSystemExtensionNode(
  node: ASTNode
): node is TypeSystemExtensionNode {
  switch (node.kind) {
    // case Kind.SCHEMA_EXTENSION:
    case Kind.SCALAR_TYPE_EXTENSION:
    case Kind.OBJECT_TYPE_EXTENSION:
    case Kind.INTERFACE_TYPE_EXTENSION:
    case Kind.UNION_TYPE_EXTENSION:
    case Kind.ENUM_TYPE_EXTENSION:
    case Kind.INPUT_OBJECT_TYPE_EXTENSION:
      return true;
    default:
      return false;
  }
}

export function highlightNodeForNode(node: ASTNode): ASTNode {
  switch (node.kind) {
    case Kind.VARIABLE_DEFINITION:
      return node.variable;
    default:
      return isNamedNode(node) ? node.name : node;
  }
}

/**
 * Not exactly the same as the executor's definition of getFieldDef, in this
 * statically evaluated environment we do not always have an Object type,
 * and need to handle Interface and Union types.
 */
export function getFieldDef(
  schema: GraphQLSchema,
  parentType: GraphQLCompositeType,
  fieldAST: FieldNode
): GraphQLField<any, any> | undefined {
  const name = fieldAST.name.value;
  if (
    name === SchemaMetaFieldDef.name &&
    schema.getQueryType() === parentType
  ) {
    return SchemaMetaFieldDef;
  }
  if (name === TypeMetaFieldDef.name && schema.getQueryType() === parentType) {
    return TypeMetaFieldDef;
  }
  if (
    name === TypeNameMetaFieldDef.name &&
    (parentType instanceof GraphQLObjectType ||
      parentType instanceof GraphQLInterfaceType ||
      parentType instanceof GraphQLUnionType)
  ) {
    return TypeNameMetaFieldDef;
  }
  if (
    parentType instanceof GraphQLObjectType ||
    parentType instanceof GraphQLInterfaceType
  ) {
    return parentType.getFields()[name];
  }

  return undefined;
}
