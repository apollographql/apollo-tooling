import gql from "graphql-tag";
import { GitContextInput } from "./checkSchema";

export interface OperationDocument {
  body: string;
  name: string;
}

export enum ValidationErrorType {
  WARNING = "WARNING",
  FAILURE = "FAILURE",
  INVALID = "INVALID"
}

export enum ValidationErrorCode {
  NON_PARSEABLE_DOCUMENT = "NON_PARSEABLE_DOCUMENT",
  INVALID_OPERATION = "INVALID_OPERATION",
  DEPRECATED_FIELD = "DEPRECATED_FIELD"
}

export interface ValidationResult {
  type: ValidationErrorType;
  code: ValidationErrorCode;
  description: string;
  operation: OperationDocument;
}

export interface ValidateOperationsVariables {
  id: string;
  tag: string;
  gitContext: GitContextInput;
  operations: [OperationDocument];
}

export const VALIDATE_OPERATIONS = gql`
  mutation ValidateOperations(
    $id: ID!
    $operations: [OperationDocumentInput!]!
    $tag: String
    $gitContext: GitContextInput
  ) {
    service(id: $id) {
      validateOperations(
        tag: $tag
        operations: $operations
        gitContext: $gitContext
      ) {
        validationResults {
          type
          code
          description
          operation {
            name
          }
        }
      }
    }
  }
`;
