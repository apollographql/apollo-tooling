import {
  GraphQLSchema,
  DocumentNode,
  DirectiveNode,
  FragmentDefinitionNode,
  OperationTypeDefinitionNode,
  SchemaDefinitionNode,
  TypeDefinitionNode,
  TypeExtensionNode,
  DirectiveDefinitionNode
} from "graphql";
import { SourceLocation } from "graphql/language/location";

declare module "graphql" {
  // FIXME: Get this into graphql-js typings, add SchemaExtensionNode
  export type TypeSystemExtensionNode = TypeExtensionNode;
}

declare module "graphql/language/source" {
  interface Source {
    body: string;
    name: string;
    locationOffset: Location;
  }
}

declare module "graphql/validation/validate" {
  interface ValidationContext {
    _fragments: { [fragmentName: string]: FragmentDefinitionNode };
  }
}

declare module "graphql/utilities/buildASTSchema" {
  function buildASTSchema(
    ast: DocumentNode,
    options?: { assumeValid?: boolean; commentDescriptions?: boolean }
  ): GraphQLSchema;
}
