import gql from "graphql-tag";

export const REGISTER_OPERATIONS = gql`
  mutation RegisterOperations(
    $serviceId: ID!
    $clientIdentity: RegisteredClientIdentityInput!
    $operations: [RegisteredOperationInput!]!
  ) {
    service(id: $serviceId) {
      registerOperations(client: { name: $clientName }, operations: $operations)
    }
  }
`;
