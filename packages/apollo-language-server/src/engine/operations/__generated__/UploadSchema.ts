/* tslint:disable */
/* eslint-disable */
// This file was automatically generated and should not be edited.

import {
  IntrospectionSchemaInput,
  GitContextInput
} from "./../../../../../../__generated__/globalTypes";

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
