/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

import { Lifespan } from "./../../../__generated__/globalTypes";

// ====================================================
// GraphQL query operation: GetDeities
// ====================================================

export interface GetDeities_deities_God {
  __typename: "God";
  name: string;
  lifespan: Lifespan;
}

export interface GetDeities_deities_Deity_Titan {
  __typename: "Deity_Titan";
  name: string;
}

export type GetDeities_deities = GetDeities_deities_God | GetDeities_deities_Deity_Titan;

export interface GetDeities {
  deities: GetDeities_deities[];
}

export interface GetDeitiesVariables {
  lifespan?: Lifespan | null;
}
