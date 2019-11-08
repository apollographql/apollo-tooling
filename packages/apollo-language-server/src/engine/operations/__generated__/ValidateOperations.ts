/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import {
  OperationDocumentInput,
  GitContextInput,
  ValidationErrorType,
  ValidationErrorCode
} from "./../../../../../../__generated__/globalTypes";

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
