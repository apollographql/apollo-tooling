import gql from "graphql-tag";

export interface RegisteredOperationMetadataInput {
  engineSignature?: string;
}
export interface RegisteredOperationInput {
  signature: string;
  document?: string;
  metadata?: RegisteredOperationMetadataInput;
}
export interface RegisteredClientIdentityInput {
  identifier: string;
  name: string;
  version?: String;
}
export interface RegisterOperationsVariables {
  id: string;
  clientIdentity: RegisteredClientIdentityInput;
  operations: RegisteredOperationInput[];
}

export const REGISTER_OPERATIONS = gql`
  mutation RegisterOperations(
    $id: ID!
    $clientIdentity: RegisteredClientIdentityInput!
    $operations: [RegisteredOperationInput!]!
  ) {
    service(id: $id) {
      registerOperations(
        clientIdentity: $clientIdentity
        operations: $operations
      )
    }
  }
`;
