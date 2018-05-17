import gql from "graphql-tag";

export const VALIDATE_SCHEMA = gql`
  mutation ValidateSchema(
    $schema: IntrospectionSchema!
    $tag: String
    $git: GitStats
  ) {
    validateSchema(schema: $schema, tag: $tag, git: $git) {
      message
      success
      code
      validations {
        type
        description
        code
      }
    }
  }
`;
