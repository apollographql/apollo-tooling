import gql from "graphql-tag";

export const UPLOAD_SCHEMA = gql`
  mutation UploadSchema($schema: IntrospectionSchema!, $tag: String) {
    uploadSchema(schema: $schema, tag: $tag) {
      hash
    }
  }
`;
