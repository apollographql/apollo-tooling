import gql from "graphql-tag";

export const VALIDATE_SCHEMA = gql`
  query CheckSchema(
    $id: ID!
    $schema: IntrospectionSchemaInput!
    $hash: ID
    $tag: String
    $gitContext: GitContextInput
  ) {
    service(id: $id) {
      schema(hash: $hash, tag: $tag) {
        checkSchema(schema: $schema, gitContext: $gitContext) {
          sdl
          changes {
            type
            code
            description
          }
        }
      }
    }
  }
`;
