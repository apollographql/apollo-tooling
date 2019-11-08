/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: ListServices
// ====================================================

export interface ListServices_service_implementingServices_NonFederatedImplementingService {
  __typename: "NonFederatedImplementingService";
}

export interface ListServices_service_implementingServices_FederatedImplementingServices_services {
  __typename: "FederatedImplementingService";
  /**
   * Identifies which graph this implementing service belongs to.
   * Formerly known as "service_id"
   */
  graphID: string;
  /**
   * Specifies which variant of a graph this implementing service belongs to".
   * Formerly known as "tag"
   */
  graphVariant: string;
  /**
   * Name of the implementing service
   */
  name: string;
  /**
   * URL of the graphql endpoint of the implementing service
   */
  url: string | null;
  /**
   * Timestamp for when this implementing service was updated
   */
  updatedAt: any;
}

export interface ListServices_service_implementingServices_FederatedImplementingServices {
  __typename: "FederatedImplementingServices";
  services: ListServices_service_implementingServices_FederatedImplementingServices_services[];
}

export type ListServices_service_implementingServices =
  | ListServices_service_implementingServices_NonFederatedImplementingService
  | ListServices_service_implementingServices_FederatedImplementingServices;

export interface ListServices_service {
  __typename: "Service";
  /**
   * List of implementing services that comprise a graph. A non-federated graph should have a single implementing service.
   * Set includeDeleted to see deleted implementing services
   */
  implementingServices: ListServices_service_implementingServices | null;
}

export interface ListServices {
  service: ListServices_service | null;
}

export interface ListServicesVariables {
  id: string;
  graphVariant: string;
}
