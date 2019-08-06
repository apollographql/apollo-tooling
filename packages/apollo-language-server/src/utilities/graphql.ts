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
  visit,
  print,
  DirectiveNode,
  OperationDefinitionNode,
  SelectionSetNode,
  FragmentDefinitionNode,
  FragmentSpreadNode
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

/**
 * Remove specific directives
 *
 * The `ast` param must extend ASTNode. We use a genetic to indicate that this function returns the same type
 * of it's first parameter.
 */
export function removeDirectives<AST extends ASTNode>(
  ast: AST,
  directiveNames: string[]
): AST {
  if (!directiveNames.length) return ast;
  return visit(ast, {
    Directive(node: DirectiveNode): DirectiveNode | null {
      if (!!directiveNames.find(name => name === node.name.value)) return null;
      return node;
    }
  });
}

/**
 * Recursively remove orphaned fragment definitions that have their names included in
 * `fragmentNamesEligibleForRemoval`
 *
 * We expclitily require the fragments to be listed in `fragmentNamesEligibleForRemoval` so we only strip
 * fragments that were orphaned by an operation, not fragments that started as oprhans
 *
 * The `ast` param must extend ASTNode. We use a genetic to indicate that this function returns the same type
 * of it's first parameter.
 */
function removeOrphanedFragmentDefinitions<AST extends ASTNode>(
  ast: AST,
  fragmentNamesEligibleForRemoval: Set<string>
): AST {
  /**
   * Flag to keep track of removing any fragments
   */
  let anyFragmentsRemoved = false;

  // Aquire names of all fragment spreads
  const fragmentSpreadNodeNames = new Set<string>();
  visit(ast, {
    FragmentSpread(node) {
      fragmentSpreadNodeNames.add(node.name.value);
    }
  });

  // Strip unused fragment definitions. Flag if we've removed any so we know if we need to continue
  // recursively checking.
  ast = visit(ast, {
    FragmentDefinition: {
      enter(node) {
        if (
          fragmentNamesEligibleForRemoval.has(node.name.value) &&
          !fragmentSpreadNodeNames.has(node.name.value)
        ) {
          // This definition is not used, remove it.
          anyFragmentsRemoved = true;
          return null;
        }

        return undefined;
      }
    },
    FragmentSpread: {
      leave(node) {
        if (!fragmentSpreadNodeNames.has(node.name.value)) {
          // This definition is not used, remove it.
          anyFragmentsRemoved = true;
          return null;
        }

        return undefined;
      }
    }
  });

  if (anyFragmentsRemoved) {
    // We've removed fragments and might have orphaned more fragments, so recursively try to remove more
    // orphaned fragments.
    return removeOrphanedFragmentDefinitions(
      ast,
      fragmentNamesEligibleForRemoval
    );
  }

  return ast;
}

/**
 * Recursively remove nodes that have zero-length selection sets
 *
 * The `ast` param must extend ASTNode. We use a genetic to indicate that this function returns the same type
 * of it's first parameter.
 */
function removeNodesWithEmptySelectionSets<AST extends ASTNode>(ast: AST): AST {
  /**
   * Flag to know if we need to make another recursive pass
   */
  let anyNodesRemoved = false;

  ast = visit(ast, {
    enter(node) {
      // If this node _has_ a `selectionSet` and it's zero-length, then remove it.
      if (
        "selectionSet" in node &&
        node.selectionSet != null &&
        node.selectionSet.selections.length === 0
      ) {
        anyNodesRemoved = true;
        return null;
      }

      return undefined;
    }
  });

  // if (anyNodesRemoved) {
  //   console.group('check for children',);
  //   return removeNodesWithEmptySelectionSets(ast);
  //   console.groupEnd();
  // }

  return ast;
}

/**
 * Remove nodes from `ast` when they have a directive in `directiveNames`
 *
 * The `ast` param must extend ASTNode. We use a genetic to indicate that this function returns the same type
 * of it's first parameter.
 */
export function removeDirectiveAnnotatedFields<AST extends ASTNode>(
  ast: AST,
  directiveNames: string[]
): AST {
  print;
  if (!directiveNames.length) return ast;

  /**
   * All fragment definition names we've removed due to a matching directive
   *
   * We keep track of these so we can remove associated spreads
   */
  const removedFragmentDefinitionNames = new Set<string>();

  /**
   * All fragment spreads that have been removed
   *
   * We can only remove fragment definitions for fragment spreads that we've removed
   */
  const removedFragmentSpreadNames = new Set<string>();

  // Remove all nodes with a matching directive in `directiveNames`. Also, remove any operations that now have
  // no selection set
  ast = visit(ast, {
    enter(node) {
      // Strip all nodes that contain a directive we wish to remove
      if (
        "directives" in node &&
        node.directives &&
        node.directives.find(directive =>
          directiveNames.includes(directive.name.value)
        )
      ) {
        // If we're removing a fragment definition then save the name so we can remove anywhere this fragment
        // was spread
        if (node.kind === Kind.FRAGMENT_DEFINITION) {
          removedFragmentDefinitionNames.add(node.name.value);
        }

        // All nested fragment spreads inside of this definition are now eligible to be removed
        visit(ast, {
          FragmentSpread(node) {
            removedFragmentSpreadNames.add(node.name.value);
          }
        });

        return null;
      }

      return undefined;
    }
  });

  // For all fragment definitions we removed, also remove the fragment spreads
  ast = visit(ast, {
    FragmentSpread(node) {
      if (removedFragmentDefinitionNames.has(node.name.value)) {
        removedFragmentSpreadNames.add(node.name.value);

        return null;
      }

      return undefined;
    }
  });

  // Remove all orphaned fragment definitions
  ast = removeOrphanedFragmentDefinitions(ast, removedFragmentSpreadNames);

  // Finally, remove nodes with empty selection sets
  return removeNodesWithEmptySelectionSets(ast);
}

const typenameField = {
  kind: Kind.FIELD,
  name: { kind: Kind.NAME, value: "__typename" }
};

export function withTypenameFieldAddedWhereNeeded(ast: ASTNode) {
  return visit(ast, {
    enter: {
      SelectionSet(node: SelectionSetNode) {
        return {
          ...node,
          selections: node.selections.filter(
            selection =>
              !(
                selection.kind === "Field" &&
                (selection as FieldNode).name.value === "__typename"
              )
          )
        };
      }
    },
    leave(node: ASTNode) {
      if (
        !(
          node.kind === Kind.FIELD ||
          node.kind === Kind.FRAGMENT_DEFINITION ||
          node.kind === Kind.INLINE_FRAGMENT
        )
      ) {
        return undefined;
      }
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
