/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import { IntrospectionTypeKind } from "./../../../../../../__generated__/globalTypes";

// ====================================================
// GraphQL fragment: IntrospectionInputValue
// ====================================================

export interface IntrospectionInputValue_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface IntrospectionInputValue_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionInputValue_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionInputValue_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionInputValue_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionInputValue_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionInputValue_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionInputValue_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionInputValue_type_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionInputValue_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionInputValue_type_ofType_ofType_ofType | null;
}

export interface IntrospectionInputValue_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionInputValue_type_ofType_ofType | null;
}

export interface IntrospectionInputValue_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionInputValue_type_ofType | null;
}

export interface IntrospectionInputValue {
  __typename: "IntrospectionInputValue";
  name: string;
  description: string | null;
  type: IntrospectionInputValue_type;
  defaultValue: string | null;
}
