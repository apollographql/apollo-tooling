/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

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
  errors: CheckPartialSchema_service_checkPartialSchema_compositionValidationResult_errors[];
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
   * day would have a `from` value of -86400. In rare cases, this could be an ISO
   * timestamp if the user passed one in on diff creation
   */
  from: any | null;
  /**
   * delta in seconds from current time that determines the end of the
   * window for reported metrics included in a schema diff. A day window
   * from the present day would have a `to` value of -0. In rare
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
  affectedClients: CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_affectedClients[] | null;
  /**
   * Operations affected by all changes in diff
   */
  affectedQueries: CheckPartialSchema_service_checkPartialSchema_checkSchemaResult_diffToPrevious_affectedQueries[] | null;
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
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: CheckSchema
// ====================================================

export interface CheckSchema_service_checkSchema_diffToPrevious_affectedClients {
  __typename: "AffectedClient";
}

export interface CheckSchema_service_checkSchema_diffToPrevious_affectedQueries {
  __typename: "AffectedQuery";
}

export interface CheckSchema_service_checkSchema_diffToPrevious_changes {
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

export interface CheckSchema_service_checkSchema_diffToPrevious_validationConfig {
  __typename: "SchemaDiffValidationConfig";
  /**
   * delta in seconds from current time that determines the start of the window
   * for reported metrics included in a schema diff. A day window from the present
   * day would have a `from` value of -86400. In rare cases, this could be an ISO
   * timestamp if the user passed one in on diff creation
   */
  from: any | null;
  /**
   * delta in seconds from current time that determines the end of the
   * window for reported metrics included in a schema diff. A day window
   * from the present day would have a `to` value of -0. In rare
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

export interface CheckSchema_service_checkSchema_diffToPrevious {
  __typename: "SchemaDiff";
  /**
   * Indication of the success of the change, either failure, warning, or notice.
   */
  severity: ChangeSeverity;
  /**
   * Clients affected by all changes in diff
   */
  affectedClients: CheckSchema_service_checkSchema_diffToPrevious_affectedClients[] | null;
  /**
   * Operations affected by all changes in diff
   */
  affectedQueries: CheckSchema_service_checkSchema_diffToPrevious_affectedQueries[] | null;
  /**
   * Number of operations that were validated during schema diff
   */
  numberOfCheckedOperations: number | null;
  /**
   * List of schema changes with associated affected clients and operations
   */
  changes: CheckSchema_service_checkSchema_diffToPrevious_changes[];
  /**
   * Configuration of validation
   */
  validationConfig: CheckSchema_service_checkSchema_diffToPrevious_validationConfig | null;
}

export interface CheckSchema_service_checkSchema {
  __typename: "CheckSchemaResult";
  /**
   * Generated url to view schema diff in Engine
   */
  targetUrl: string | null;
  /**
   * Schema diff and affected operations generated by the schema check
   */
  diffToPrevious: CheckSchema_service_checkSchema_diffToPrevious;
}

export interface CheckSchema_service {
  __typename: "ServiceMutation";
  /**
   * Checks a proposed schema against the schema that has been published to
   * a particular tag, using metrics that have been published to the base tag.
   * Callers can set the historicParameters directly, which will be used if
   * provided. If useMaximumRetention is provided, but historicParameters is not,
   * then validation will use the maximum retention the graph has access to.
   * If neither historicParameters nor useMaximumRetention is provided, the
   * default time range of one week (7 days) will be used.
   */
  checkSchema: CheckSchema_service_checkSchema;
}

export interface CheckSchema {
  service: CheckSchema_service | null;
}

export interface CheckSchemaVariables {
  id: string;
  schema?: IntrospectionSchemaInput | null;
  schemaHash?: string | null;
  tag?: string | null;
  gitContext?: GitContextInput | null;
  historicParameters?: HistoricQueryParameters | null;
}

/* tslint:disable */
/* eslint-disable */
// @generated
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

export type ListServices_service_implementingServices = ListServices_service_implementingServices_NonFederatedImplementingService | ListServices_service_implementingServices_FederatedImplementingServices;

export interface ListServices_service {
  __typename: "Service";
  /**
   * List of implementing services that comprise a graph. A non-federated graph should have a single implementing service.
   * Set includeDeleted to see deleted implementing services.
   */
  implementingServices: ListServices_service_implementingServices | null;
}

export interface ListServices {
  frontendUrlRoot: string;
  /**
   * Service by ID
   */
  service: ListServices_service | null;
}

export interface ListServicesVariables {
  id: string;
  graphVariant: string;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: RegisterOperations
// ====================================================

export interface RegisterOperations_service_registerOperationsWithResponse_invalidOperations_errors {
  __typename: "OperationValidationError";
  message: string;
}

export interface RegisterOperations_service_registerOperationsWithResponse_invalidOperations {
  __typename: "InvalidOperation";
  errors: RegisterOperations_service_registerOperationsWithResponse_invalidOperations_errors[] | null;
  signature: string;
}

export interface RegisterOperations_service_registerOperationsWithResponse_newOperations {
  __typename: "RegisteredOperation";
  signature: string;
}

export interface RegisterOperations_service_registerOperationsWithResponse {
  __typename: "RegisterOperationsMutationResponse";
  invalidOperations: RegisterOperations_service_registerOperationsWithResponse_invalidOperations[] | null;
  newOperations: RegisterOperations_service_registerOperationsWithResponse_newOperations[] | null;
  registrationSuccess: boolean;
}

export interface RegisterOperations_service {
  __typename: "ServiceMutation";
  registerOperationsWithResponse: RegisterOperations_service_registerOperationsWithResponse | null;
}

export interface RegisterOperations {
  service: RegisterOperations_service | null;
}

export interface RegisterOperationsVariables {
  id: string;
  clientIdentity: RegisteredClientIdentityInput;
  operations: RegisteredOperationInput[];
  manifestVersion: number;
  graphVariant?: string | null;
}

/* tslint:disable */
/* eslint-disable */
// @generated
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
   * List of GCS links for implementing services that comprise a composed graph. Is empty if tag/inaccessible is enabled.
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
   * published to the implementing service if there were any errors encountered.
   */
  errors: (RemoveServiceAndCompose_service_removeImplementingServiceAndTriggerComposition_errors | null)[];
  /**
   * Whether the gateway link was updated, or would have been for dry runs.
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

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: SchemaTagsAndFieldStats
// ====================================================

export interface SchemaTagsAndFieldStats_service_schemaTags {
  __typename: "SchemaTag";
  tag: string;
}

export interface SchemaTagsAndFieldStats_service_stats_fieldStats_groupBy {
  __typename: "ServiceFieldLatenciesDimensions";
  field: string | null;
}

export interface SchemaTagsAndFieldStats_service_stats_fieldStats_metrics_fieldHistogram {
  __typename: "DurationHistogram";
  durationMs: number | null;
}

export interface SchemaTagsAndFieldStats_service_stats_fieldStats_metrics {
  __typename: "ServiceFieldLatenciesMetrics";
  fieldHistogram: SchemaTagsAndFieldStats_service_stats_fieldStats_metrics_fieldHistogram;
}

export interface SchemaTagsAndFieldStats_service_stats_fieldStats {
  __typename: "ServiceFieldLatenciesRecord";
  /**
   * Dimensions of ServiceFieldLatencies that can be grouped by.
   */
  groupBy: SchemaTagsAndFieldStats_service_stats_fieldStats_groupBy;
  /**
   * Metrics of ServiceFieldLatencies that can be aggregated over.
   */
  metrics: SchemaTagsAndFieldStats_service_stats_fieldStats_metrics;
}

export interface SchemaTagsAndFieldStats_service_stats {
  __typename: "ServiceStatsWindow";
  fieldStats: SchemaTagsAndFieldStats_service_stats_fieldStats[];
}

export interface SchemaTagsAndFieldStats_service {
  __typename: "Service";
  /**
   * Get schema tags, with optional filtering to a set of tags. Always sorted by creation
   * date in reverse chronological order.
   */
  schemaTags: SchemaTagsAndFieldStats_service_schemaTags[] | null;
  stats: SchemaTagsAndFieldStats_service_stats;
}

export interface SchemaTagsAndFieldStats {
  /**
   * Service by ID
   */
  service: SchemaTagsAndFieldStats_service | null;
}

export interface SchemaTagsAndFieldStatsVariables {
  id: string;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

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
  upsertImplementingServiceAndTriggerComposition: UploadAndComposePartialSchema_service_upsertImplementingServiceAndTriggerComposition | null;
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

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: UploadSchema
// ====================================================

export interface UploadSchema_service_uploadSchema_tag_schema {
  __typename: "Schema";
  hash: string;
}

export interface UploadSchema_service_uploadSchema_tag {
  __typename: "SchemaTag";
  tag: string;
  schema: UploadSchema_service_uploadSchema_tag_schema;
}

export interface UploadSchema_service_uploadSchema {
  __typename: "UploadSchemaMutationResponse";
  code: string;
  message: string;
  success: boolean;
  tag: UploadSchema_service_uploadSchema_tag | null;
}

export interface UploadSchema_service {
  __typename: "ServiceMutation";
  uploadSchema: UploadSchema_service_uploadSchema | null;
}

export interface UploadSchema {
  service: UploadSchema_service | null;
}

export interface UploadSchemaVariables {
  id: string;
  schema: IntrospectionSchemaInput;
  tag: string;
  gitContext?: GitContextInput | null;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL mutation operation: ValidateOperations
// ====================================================

export interface ValidateOperations_service_validateOperations_validationResults_operation {
  __typename: "OperationDocument";
  /**
   * Operation name
   */
  name: string | null;
}

export interface ValidateOperations_service_validateOperations_validationResults {
  __typename: "ValidationResult";
  /**
   * The type of validation error thrown - warning, failure, or invalid.
   */
  type: ValidationErrorType;
  /**
   * The validation result's error code
   */
  code: ValidationErrorCode;
  /**
   * Description of the validation error
   */
  description: string;
  /**
   * The operation related to this validation result
   */
  operation: ValidateOperations_service_validateOperations_validationResults_operation;
}

export interface ValidateOperations_service_validateOperations {
  __typename: "ValidateOperationsResult";
  validationResults: ValidateOperations_service_validateOperations_validationResults[];
}

export interface ValidateOperations_service {
  __typename: "ServiceMutation";
  validateOperations: ValidateOperations_service_validateOperations;
}

export interface ValidateOperations {
  service: ValidateOperations_service | null;
}

export interface ValidateOperationsVariables {
  id: string;
  operations: OperationDocumentInput[];
  tag?: string | null;
  gitContext?: GitContextInput | null;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL query operation: GetSchemaByTag
// ====================================================

export interface GetSchemaByTag_service_schema___schema_queryType {
  __typename: "IntrospectionType";
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_mutationType {
  __typename: "IntrospectionType";
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_subscriptionType {
  __typename: "IntrospectionType";
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_args_type_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_args {
  __typename: "IntrospectionInputValue";
  name: string;
  description: string | null;
  type: GetSchemaByTag_service_schema___schema_types_fields_args_type;
  defaultValue: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_type_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_fields_type_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_fields {
  __typename: "IntrospectionField";
  name: string;
  description: string | null;
  args: GetSchemaByTag_service_schema___schema_types_fields_args[];
  type: GetSchemaByTag_service_schema___schema_types_fields_type;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_inputFields_type_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_inputFields {
  __typename: "IntrospectionInputValue";
  name: string;
  description: string | null;
  type: GetSchemaByTag_service_schema___schema_types_inputFields_type;
  defaultValue: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_interfaces_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_interfaces {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_interfaces_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_enumValues {
  __typename: "IntrospectionEnumValue";
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types_possibleTypes {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_types_possibleTypes_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_types {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  description: string | null;
  fields: GetSchemaByTag_service_schema___schema_types_fields[] | null;
  inputFields: GetSchemaByTag_service_schema___schema_types_inputFields[] | null;
  interfaces: GetSchemaByTag_service_schema___schema_types_interfaces[] | null;
  enumValues: GetSchemaByTag_service_schema___schema_types_enumValues[] | null;
  possibleTypes: GetSchemaByTag_service_schema___schema_types_possibleTypes[] | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_directives_args_type_ofType_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: GetSchemaByTag_service_schema___schema_directives_args_type_ofType | null;
}

export interface GetSchemaByTag_service_schema___schema_directives_args {
  __typename: "IntrospectionInputValue";
  name: string;
  description: string | null;
  type: GetSchemaByTag_service_schema___schema_directives_args_type;
  defaultValue: string | null;
}

export interface GetSchemaByTag_service_schema___schema_directives {
  __typename: "IntrospectionDirective";
  name: string;
  description: string | null;
  locations: IntrospectionDirectiveLocation[];
  args: GetSchemaByTag_service_schema___schema_directives_args[];
}

export interface GetSchemaByTag_service_schema___schema {
  __typename: "IntrospectionSchema";
  queryType: GetSchemaByTag_service_schema___schema_queryType;
  mutationType: GetSchemaByTag_service_schema___schema_mutationType | null;
  subscriptionType: GetSchemaByTag_service_schema___schema_subscriptionType | null;
  types: GetSchemaByTag_service_schema___schema_types[];
  directives: GetSchemaByTag_service_schema___schema_directives[];
}

export interface GetSchemaByTag_service_schema {
  __typename: "Schema";
  hash: string;
  __schema: GetSchemaByTag_service_schema___schema;
}

export interface GetSchemaByTag_service {
  __typename: "Service";
  /**
   * Get a schema by hash OR current tag
   */
  schema: GetSchemaByTag_service_schema | null;
}

export interface GetSchemaByTag {
  /**
   * Service by ID
   */
  service: GetSchemaByTag_service | null;
}

export interface GetSchemaByTagVariables {
  tag: string;
  id: string;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

// ====================================================
// GraphQL fragment: IntrospectionFullType
// ====================================================

export interface IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_args_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_args_type_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_args_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_args_type_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_args_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_args_type_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_args_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_args_type_ofType | null;
}

export interface IntrospectionFullType_fields_args {
  __typename: "IntrospectionInputValue";
  name: string;
  description: string | null;
  type: IntrospectionFullType_fields_args_type;
  defaultValue: string | null;
}

export interface IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_type_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_type_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_type_ofType_ofType | null;
}

export interface IntrospectionFullType_fields_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_fields_type_ofType | null;
}

export interface IntrospectionFullType_fields {
  __typename: "IntrospectionField";
  name: string;
  description: string | null;
  args: IntrospectionFullType_fields_args[];
  type: IntrospectionFullType_fields_type;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_inputFields_type_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_inputFields_type_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_inputFields_type_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_inputFields_type_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_inputFields_type_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_inputFields_type_ofType_ofType | null;
}

export interface IntrospectionFullType_inputFields_type {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_inputFields_type_ofType | null;
}

export interface IntrospectionFullType_inputFields {
  __typename: "IntrospectionInputValue";
  name: string;
  description: string | null;
  type: IntrospectionFullType_inputFields_type;
  defaultValue: string | null;
}

export interface IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_interfaces_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_interfaces_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_interfaces_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_interfaces_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_interfaces_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_interfaces_ofType_ofType | null;
}

export interface IntrospectionFullType_interfaces {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_interfaces_ofType | null;
}

export interface IntrospectionFullType_enumValues {
  __typename: "IntrospectionEnumValue";
  name: string;
  description: string | null;
  isDeprecated: boolean;
  deprecationReason: string | null;
}

export interface IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
}

export interface IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_possibleTypes_ofType_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_possibleTypes_ofType_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_possibleTypes_ofType_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_possibleTypes_ofType_ofType_ofType | null;
}

export interface IntrospectionFullType_possibleTypes_ofType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_possibleTypes_ofType_ofType | null;
}

export interface IntrospectionFullType_possibleTypes {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  ofType: IntrospectionFullType_possibleTypes_ofType | null;
}

export interface IntrospectionFullType {
  __typename: "IntrospectionType";
  kind: IntrospectionTypeKind | null;
  name: string | null;
  description: string | null;
  fields: IntrospectionFullType_fields[] | null;
  inputFields: IntrospectionFullType_inputFields[] | null;
  interfaces: IntrospectionFullType_interfaces[] | null;
  enumValues: IntrospectionFullType_enumValues[] | null;
  possibleTypes: IntrospectionFullType_possibleTypes[] | null;
}

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

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

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

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

/* tslint:disable */
/* eslint-disable */
// @generated
// This file was automatically generated and should not be edited.

//==============================================================
// START Enums and Input Objects
//==============================================================

export enum ChangeSeverity {
  FAILURE = "FAILURE",
  NOTICE = "NOTICE",
}

/**
 * __DirectiveLocation introspection type
 */
export enum IntrospectionDirectiveLocation {
  ARGUMENT_DEFINITION = "ARGUMENT_DEFINITION",
  ENUM = "ENUM",
  ENUM_VALUE = "ENUM_VALUE",
  FIELD = "FIELD",
  FIELD_DEFINITION = "FIELD_DEFINITION",
  FRAGMENT_DEFINITION = "FRAGMENT_DEFINITION",
  FRAGMENT_SPREAD = "FRAGMENT_SPREAD",
  INLINE_FRAGMENT = "INLINE_FRAGMENT",
  INPUT_FIELD_DEFINITION = "INPUT_FIELD_DEFINITION",
  INPUT_OBJECT = "INPUT_OBJECT",
  INTERFACE = "INTERFACE",
  MUTATION = "MUTATION",
  OBJECT = "OBJECT",
  QUERY = "QUERY",
  SCALAR = "SCALAR",
  SCHEMA = "SCHEMA",
  SUBSCRIPTION = "SUBSCRIPTION",
  UNION = "UNION",
  VARIABLE_DEFINITION = "VARIABLE_DEFINITION",
}

export enum IntrospectionTypeKind {
  ENUM = "ENUM",
  INPUT_OBJECT = "INPUT_OBJECT",
  INTERFACE = "INTERFACE",
  LIST = "LIST",
  NON_NULL = "NON_NULL",
  OBJECT = "OBJECT",
  SCALAR = "SCALAR",
  UNION = "UNION",
}

export enum ValidationErrorCode {
  DEPRECATED_FIELD = "DEPRECATED_FIELD",
  INVALID_OPERATION = "INVALID_OPERATION",
  NON_PARSEABLE_DOCUMENT = "NON_PARSEABLE_DOCUMENT",
}

export enum ValidationErrorType {
  FAILURE = "FAILURE",
  INVALID = "INVALID",
  WARNING = "WARNING",
}

/**
 * Filter options to exclude by client reference ID, client name, and client version.
 */
export interface ClientInfoFilter {
  referenceID?: string | null;
  name?: string | null;
  version?: string | null;
}

/**
 * This is stored with a schema when it is uploaded
 */
export interface GitContextInput {
  remoteUrl?: string | null;
  commit?: string | null;
  committer?: string | null;
  message?: string | null;
  branch?: string | null;
}

export interface HistoricQueryParameters {
  from?: any | null;
  to?: any | null;
  queryCountThreshold?: number | null;
  queryCountThresholdPercentage?: number | null;
  ignoredOperations?: string[] | null;
  excludedClients?: ClientInfoFilter[] | null;
  includedVariants?: string[] | null;
}

export interface IntrospectionDirectiveInput {
  name: string;
  description?: string | null;
  locations: IntrospectionDirectiveLocation[];
  args: IntrospectionInputValueInput[];
  isRepeatable?: boolean | null;
}

/**
 * __EnumValue introspection type
 */
export interface IntrospectionEnumValueInput {
  name: string;
  description?: string | null;
  isDeprecated: boolean;
  deprecationReason?: string | null;
}

/**
 * __Field introspection type
 */
export interface IntrospectionFieldInput {
  name: string;
  description?: string | null;
  args: IntrospectionInputValueInput[];
  type: IntrospectionTypeInput;
  isDeprecated: boolean;
  deprecationReason?: string | null;
}

/**
 * __Value introspection type
 */
export interface IntrospectionInputValueInput {
  name: string;
  description?: string | null;
  type: IntrospectionTypeInput;
  defaultValue?: string | null;
  isDeprecated?: boolean | null;
  deprecationReason?: string | null;
}

/**
 * __Schema introspection type
 */
export interface IntrospectionSchemaInput {
  types?: IntrospectionTypeInput[] | null;
  queryType: IntrospectionTypeRefInput;
  mutationType?: IntrospectionTypeRefInput | null;
  subscriptionType?: IntrospectionTypeRefInput | null;
  directives: IntrospectionDirectiveInput[];
  description?: string | null;
}

/**
 * __Type introspection type
 */
export interface IntrospectionTypeInput {
  kind: IntrospectionTypeKind;
  name?: string | null;
  description?: string | null;
  specifiedByUrl?: string | null;
  fields?: IntrospectionFieldInput[] | null;
  interfaces?: IntrospectionTypeInput[] | null;
  possibleTypes?: IntrospectionTypeInput[] | null;
  enumValues?: IntrospectionEnumValueInput[] | null;
  inputFields?: IntrospectionInputValueInput[] | null;
  ofType?: IntrospectionTypeInput | null;
}

/**
 * Shallow __Type introspection type
 */
export interface IntrospectionTypeRefInput {
  name: string;
  kind?: string | null;
}

export interface OperationDocumentInput {
  body: string;
  name?: string | null;
}

/**
 * Input for registering a partial schema to an implementing service.
 * One of the fields must be specified (validated server-side).
 * 
 * If a new partialSchemaSDL is passed in, this operation will store it before
 * creating the association.
 * 
 * If both the sdl and hash are specified, an error will be thrown if the provided
 * hash doesn't match our hash of the sdl contents. If the sdl field is specified,
 * the hash does not need to be and will be computed server-side.
 */
export interface PartialSchemaInput {
  sdl?: string | null;
  hash?: string | null;
}

export interface RegisteredClientIdentityInput {
  identifier: string;
  name: string;
  version?: string | null;
}

export interface RegisteredOperationInput {
  signature: string;
  document?: string | null;
  metadata?: RegisteredOperationMetadataInput | null;
}

export interface RegisteredOperationMetadataInput {
  engineSignature?: string | null;
}

//==============================================================
// END Enums and Input Objects
//==============================================================
