import gql from "graphql-tag";

export const UPLOAD_SCHEMA = gql`
  mutation UploadSchema(
    $schema: IntrospectionSchemaInput!
    $tag: String
    $gitContext: GitContext
  ) {
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
`;
