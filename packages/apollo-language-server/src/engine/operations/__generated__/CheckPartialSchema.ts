/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import {
  PartialSchemaInput,
  GitContextInput,
  HistoricQueryParameters,
  ChangeSeverity
} from "./../../../../../../__generated__/globalTypes";

// ====================================================
// GraphQL mutation operation: CheckPartialSchema
// ====================================================

export interface CheckPartialSchema_service_checkPartialSchema_compositionValidationResult_compositionValidationDetails {
  __typename: "CompositionValidationDetails";
  /**
   * Hash of the composed schema
   */
  schemaHash: string | null;
}

export interface CheckPartialSchema_service_checkPartialSchema_compositionValidationResult_errors {
  __typename: "SchemaCompositionError";
  message: string;
}

export interface CheckPartialSchema_service_checkPartialSchema_compositionValidationResult {
  __typename: "CompositionValidationResult";
  /**
   * Akin to a composition config, represents the partial schemas and implementing services that were used
   * in running composition. Will be null if any errors are encountered. Also may contain a schema hash if
   * one could be computed, which can be used for schema validation.
   */
  compositionValidationDetails: CheckPartialSchema_service_checkPartialSchema_compositionValidationResult_compositionValidationDetails | null;
  /**
   * ID that points to the results of this composition.
   */
  graphCompositionID: string;
  /**
   * List of errors during composition. Errors mean that Apollo was unable to compose the
   * graph's implementing services into a GraphQL schema. This partial schema should not be
   * published to the implementing service if there were any errors encountered
   */
  errors: (CheckPartialSchema_service_checkPartialSchema_compositionValidationResult_errors | null)[];
}

export interface CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_affectedClients {
  __typename: "AffectedClient";
}

export interface CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_affectedQueries {
  __typename: "AffectedQuery";
}

export interface CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_changes {
  __typename: "Change";
  /**
   * Indication of the success of the overall change, either failure, warning, or notice.
   */
  severity: ChangeSeverity;
  /**
   * Indication of the kind of target and action of the change, e.g. 'TYPE_REMOVED'.
   */
  code: string;
  /**
   * Explanation of both the target of the change and how it was changed.
   */
  description: string;
}

export interface CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_validationConfig {
  __typename: "SchemaDiffValidationConfig";
  /**
   * delta in seconds from current time that determines the start of the window
   * for reported metrics included in a schema diff. A day window from the present
   * day would have a \`from\` value of -86400. In rare cases, this could be an ISO
   * timestamp if the user passed one in on diff creation
   */
  from: any | null;
  /**
   * delta in seconds from current time that determines the end of the
   * window for reported metrics included in a schema diff. A day window
   * from the present day would have a \`to\` value of -0. In rare
   * cases, this could be an ISO timestamp if the user passed one in on diff
   * creation
   */
  to: any | null;
  /**
   * Minimum number of requests within the window for a query to be considered.
   */
  queryCountThreshold: number | null;
  /**
   * Number of requests within the window for a query to be considered, relative to
   * total request count. Expected values are between 0 and 0.05 (minimum 5% of
   * total request volume)
   */
  queryCountThresholdPercentage: number | null;
}

export interface CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious {
  __typename: "SchemaDiff";
  /**
   * Indication of the success of the change, either failure, warning, or notice.
   */
  severity: ChangeSeverity;
  /**
   * Clients affected by all changes in diff
   */
  affectedClients:
    | CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_affectedClients[]
    | null;
  /**
   * Operations affected by all changes in diff
   */
  affectedQueries:
    | CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_affectedQueries[]
    | null;
  /**
   * Number of operations that were validated during schema diff
   */
  numberOfCheckedOperations: number | null;
  /**
   * List of schema changes with associated affected clients and operations
   */
  changes: CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_changes[];
  /**
   * Configuration of validation
   */
  validationConfig: CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_validationConfig | null;
}

export interface CheckPartialSchema_service_checkPartialSchema_checkSchemaResult {
  __typename: "CheckSchemaResult";
  /**
   * Schema diff and affected operations generated by the schema check
   */
  diffToPrevious: CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious;
  /**
   * Generated url to view schema diff in Engine
   */
  targetUrl: string | null;
}

export interface CheckPartialSchema_service_checkPartialSchema {
  __typename: "CheckPartialSchemaResult";
  /**
   * Result of composition validation run before the schema check.
   */
  compositionValidationResult: CheckPartialSchema_service_checkPartialSchema_compositionValidationResult;
  /**
   * Result of traffic validation. This will be null if composition validation was unsuccessful.
   */
  checkSchemaResult: CheckPartialSchema_service_checkPartialSchema_checkSchemaResult | null;
}

export interface CheckPartialSchema_service {
  __typename: "ServiceMutation";
  /**
   * Compose an implementing service's partial schema, diff the composed schema, validate traffic against that schema,
   * and store the result so the details can be viewed by users in the UI.
   * This mutation will not mark the schema as "published".
   */
  checkPartialSchema: CheckPartialSchema_service_checkPartialSchema;
}

export interface CheckPartialSchema {
  service: CheckPartialSchema_service | null;
}

export interface CheckPartialSchemaVariables {
  id: string;
  graphVariant: string;
  implementingServiceName: string;
  partialSchema: PartialSchemaInput;
  gitContext?: GitContextInput | null;
  historicParameters?: HistoricQueryParameters | null;
  frontend?: string | null;
}
