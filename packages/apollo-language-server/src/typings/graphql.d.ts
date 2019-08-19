import {
  ASTNode,
  TypeSystemDefinitionNode,
  TypeSystemExtensionNode,
  FragmentDefinitionNode,
  OperationDefinitionNode
} from "@apollo/graphql";

// FIXME: We should add proper type guards for these predicate functions
// to `@types/graphql`.
declare module "@apollo/graphql/language/predicates" {
  function isExecutableDefinitionNode(
    node: ASTNode
  ): node is OperationDefinitionNode | FragmentDefinitionNode;
  function isTypeSystemDefinitionNode(
    node: ASTNode
  ): node is TypeSystemDefinitionNode;
  function isTypeSystemExtensionNode(
    node: ASTNode
  ): node is TypeSystemExtensionNode;
}

declare module "@apollo/graphql/validation/validate" {
  interface ValidationContext {
    _fragments: { [fragmentName: string]: FragmentDefinitionNode };
  }
}
