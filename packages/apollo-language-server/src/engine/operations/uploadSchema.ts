import { IntrospectionSchema } from "graphql";
import gql from "graphql-tag";

import { GitContextInput } from "./checkSchema";

export interface UploadSchemaVariables {
  schema: IntrospectionSchema;
  tag: string;
  gitContext: GitContextInput;
}

export const UPLOAD_SCHEMA = gql`
  mutation UploadSchema(
    $schema: IntrospectionSchemaInput!
    $tag: String!
    $gitContext: GitContextInput
  ) {
    service: me {
      ... on Service {
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
  }
`;
