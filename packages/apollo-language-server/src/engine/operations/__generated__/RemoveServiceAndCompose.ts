/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: RemoveServiceAndCompose
// ====================================================

export interface RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_compositionConfig_implementingServiceLocations {
  __typename: "ImplementingServiceLocation";
  /**
   * The name of the implementing service
   */
  name: string;
  /**
   * The path in storage to access the implementing service config file
   */
  path: string;
}

export interface RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_compositionConfig {
  __typename: "CompositionConfig";
  /**
   * List of implementing services that comprise a composed graph
   */
  implementingServiceLocations: RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_compositionConfig_implementingServiceLocations[];
}

export interface RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_errors_locations {
  __typename: "SourceLocation";
  column: number;
  line: number;
}

export interface RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_errors {
  __typename: "SchemaCompositionError";
  locations: (RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_errors_locations | null)[];
  message: string;
}

export interface RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition {
  __typename: "CompositionAndRemoveResult";
  /**
   * The produced composition config. Will be null if there are any errors
   */
  compositionConfig: RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_compositionConfig | null;
  /**
   * List of errors during composition. Errors mean that Apollo was unable to compose the
   * graph's implementing services into a GraphQL schema. This partial schema should not be
   * published to the implementing service if there were any errors encountered
   */
  errors: (RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_errors | null)[];
  /**
   * Whether the gateway link was updated.
   */
  updatedGateway: boolean;
}

export interface RemoveServiceAndCompose_service {
  __typename: "ServiceMutation";
  removeImplementingServiceAndTriggerComposition: RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition;
}

export interface RemoveServiceAndCompose {
  service: RemoveServiceAndCompose_service | null;
}

export interface RemoveServiceAndComposeVariables {
  id: string;
  graphVariant: string;
  name: string;
}
