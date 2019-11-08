/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import { IntrospectionTypeKind } from "./../../../../../../__generated__/globalTypes";

// ====================================================
// GraphQL fragment: IntrospectionTypeRef
// ====================================================

export interface IntrospectionTypeRef_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface IntrospectionTypeRef_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionTypeRef_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionTypeRef_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionTypeRef_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionTypeRef_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionTypeRef_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionTypeRef_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionTypeRef_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionTypeRef_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionTypeRef_ofType_ofType_ofType | null;
}

export interface IntrospectionTypeRef_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionTypeRef_ofType_ofType | null;
}

export interface IntrospectionTypeRef {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionTypeRef_ofType | null;
}
