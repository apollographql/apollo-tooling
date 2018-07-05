import gql from "graphql-tag";

export const VALIDATE_OPERATIONS = gql`
  query CheckOperations(
    $id: ID!
    $operations: [QueryDocumentInput!]!
    $hash: ID
    $tag: String
    $gitContext: GitContextInput
  ) {
    service(id: $id) {
      schema(hash: $hash, tag: $tag) {
        checkOperations(operations: $operations, gitContext: $gitContext) {
          type
          code
          description
        }
      }
    }
  }
`;
