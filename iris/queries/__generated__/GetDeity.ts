/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { Lifespan } from "./../../../__generated__/globalTypes";

// ====================================================
// GraphQL query operation: GetDeity
// ====================================================

export interface GetDeity_deity {
  __typename: "Deity";
  name: string | null;
  power: any | null;
  lifespan: Lifespan | null;
}

export interface GetDeity {
  deity: GetDeity_deity | null;
}
