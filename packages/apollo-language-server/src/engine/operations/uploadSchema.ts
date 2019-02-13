import { IntrospectionSchema } from "graphql";
import gql from "graphql-tag";

import { GitContextInput } from "./checkSchema";

export interface UploadSchemaVariables {
  id: string;
  schema: IntrospectionSchema;
  tag: string;
  gitContext: GitContextInput;
}

export const UPLOAD_SCHEMA = gql`
  mutation UploadSchema(
    $id: ID!
    $schema: IntrospectionSchemaInput!
    $tag: String!
    $gitContext: GitContextInput
  ) {
    service(id: $id) {
      uploadSchema(schema: $schema, tag: $tag, gitContext: $gitContext) {
        code
        message
        success
        tag {
          tag
          schema {
            hash
          }
        }
      }
    }
  }
`;
