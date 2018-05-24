import gql from "graphql-tag";

export const UPLOAD_SCHEMA = gql`
  mutation UploadSchema($schema: IntrospectionSchemaInput!, $tag: String) {
    uploadSchema(schema: $schema, tag: $tag) {
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
