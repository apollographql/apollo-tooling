import gql from "graphql-tag";

export const REGISTER_OPERATIONS = gql`
  mutation RegisterOperations(
    $serviceId: ID!
    $clientName: String!
    $operations: [RegisteredOperationInput!]!
  ) {
    service(id: $serviceId) {
      registerOperations(client: { name: $clientName }, operations: $operations)
    }
  }
`;
