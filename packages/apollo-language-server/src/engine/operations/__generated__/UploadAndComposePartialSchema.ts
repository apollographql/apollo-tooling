/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import { PartialSchemaInput } from "./../../../../../../__generated__/globalTypes";

// ====================================================
// GraphQL mutation operation: UploadAndComposePartialSchema
// ====================================================

export interface UploadAndComposePartialSchema_service_upsertImplementingServiceAndTriggerComposition_compositionConfig {
  __typename: "CompositionConfig";
  /**
   * Hash of the composed schema
   */
  schemaHash: string;
}

export interface UploadAndComposePartialSchema_service_upsertImplementingServiceAndTriggerComposition_errors {
  __typename: "SchemaCompositionError";
  message: string;
}

export interface UploadAndComposePartialSchema_service_upsertImplementingServiceAndTriggerComposition {
  __typename: "CompositionAndUpsertResult";
  /**
   * The produced composition config. Will be null if there are any errors
   */
  compositionConfig: UploadAndComposePartialSchema_service_upsertImplementingServiceAndTriggerComposition_compositionConfig | null;
  /**
   * List of errors during composition. Errors mean that Apollo was unable to compose the
   * graph's implementing services into a GraphQL schema. This partial schema should not be
   * published to the implementing service if there were any errors encountered
   */
  errors: (UploadAndComposePartialSchema_service_upsertImplementingServiceAndTriggerComposition_errors | null)[];
  /**
   * Whether the gateway link was updated.
   */
  didUpdateGateway: boolean;
  /**
   * Whether an implementingService was created as part of this mutation
   */
  serviceWasCreated: boolean;
}

export interface UploadAndComposePartialSchema_service {
  __typename: "ServiceMutation";
  upsertImplementingServiceAndTriggerComposition: UploadAndComposePartialSchema_service_upsertImplementingServiceAndTriggerComposition;
}

export interface UploadAndComposePartialSchema {
  service: UploadAndComposePartialSchema_service | null;
}

export interface UploadAndComposePartialSchemaVariables {
  id: string;
  graphVariant: string;
  name: string;
  url: string;
  revision: string;
  activePartialSchema: PartialSchemaInput;
}
