/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import {
  RegisteredClientIdentityInput,
  RegisteredOperationInput
} from "./../../../../../../__generated__/globalTypes";

// ====================================================
// GraphQL mutation operation: RegisterOperations
// ====================================================

export interface RegisterOperations_service_registerOperationsWithResponse_invalidOperations_errors {
  __typename: "OperationValidationError";
  message: string;
}

export interface RegisterOperations_service_registerOperationsWithResponse_invalidOperations {
  __typename: "InvalidOperation";
  errors:
    | RegisterOperations_service_registerOperationsWithResponse_invalidOperations_errors[]
    | null;
  signature: string;
}

export interface RegisterOperations_service_registerOperationsWithResponse_newOperations {
  __typename: "RegisteredOperation";
  signature: string;
}

export interface RegisterOperations_service_registerOperationsWithResponse {
  __typename: "RegisterOperationsMutationResponse";
  invalidOperations:
    | RegisterOperations_service_registerOperationsWithResponse_invalidOperations[]
    | null;
  newOperations:
    | RegisterOperations_service_registerOperationsWithResponse_newOperations[]
    | null;
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
