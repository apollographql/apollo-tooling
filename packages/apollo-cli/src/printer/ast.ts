import {
  TypeNode,
  GraphQLNamedType,
  GraphQLField,
  ASTKindToNode,
  TypeDefinitionNode,
  FieldDefinitionNode,
  EnumValueDefinitionNode,
  InputValueDefinitionNode,
} from "graphql";

export type Maybe<T> = null | undefined | T;

export enum TypeKind {
  SCALAR = "ScalarTypeDefinition",
  OBJECT = "ObjectTypeDefinition",
  INTERFACE = "InterfaceTypeDefinition",
  UNION = "UnionTypeDefinition",
  ENUM = "EnumTypeDefinition",
  INPUT_OBJECT = "InputObjectTypeDefinition",
  LIST = "ListTypeDefinition",
  NON_NULL = "NonNullTypeDefinition",
}

export enum ChangeType {
  FAILURE = "FAILURE",
  WARNING = "WARNING",
  NOTICE = "NOTICE",
}

export type DiffType = TypeDefinitionNode & { change?: Change };
export type DiffField = FieldDefinitionNode & { change?: Change };
export type DiffInputValue = InputValueDefinitionNode & { change?: Change };
export type DiffEnum = EnumValueDefinitionNode & { change?: Change };

export interface Change {
  change: ChangeType;
  code: string;
  description: string;
  type?: Maybe<DiffType>;
}

export interface DiffTypeMap {
  [key: string]: DiffType;
}

export interface TypeMap {
  [key: string]: GraphQLNamedType;
}
