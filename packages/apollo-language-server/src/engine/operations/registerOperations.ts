import gql from "graphql-tag";

export const REGISTER_OPERATIONS = gql`
  mutation RegisterOperations(
    $id: ID!
    $clientIdentity: RegisteredClientIdentityInput!
    $operations: [RegisteredOperationInput!]!
    $manifestVersion: Int!
  ) {
    service(id: $id) {
      registerOperations(
        clientIdentity: $clientIdentity
        operations: $operations
        manifestVersion: $manifestVersion
      )
    }
  }
`;
