import {
  ASTNode,
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode,
  FragmentDefinitionNode
} from "graphql";

// FIXME: We should add proper type guards for these predicate functions
// to `@types/graphql`.
declare module "graphql/language/predicates" {
  function isTypeSystemDefinitionNode(
    node: ASTNode
  ): node is TypeSystemDefinitionNode;
  function isTypeSystemExtensionNode(
    node: ASTNode
  ): node is TypeSystemExtensionNode;
}

declare module "graphql/validation/validate" {
  interface ValidationContext {
    _fragments: { [fragmentName: string]: FragmentDefinitionNode };
  }
}
