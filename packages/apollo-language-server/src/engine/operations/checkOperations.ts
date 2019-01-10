import gql from "graphql-tag";

import { GitContextInput } from "./checkSchema";

export interface QueryDocumentInput {
  document: string;
}

export interface CheckOperationsVariables {
  id: string;
  operations: QueryDocumentInput[];
  tag?: string;
  gitContext?: GitContextInput;
}

export const CHECK_OPERATIONS = gql`
  mutation CheckOperations(
    $id: ID!
    $operations: [QueryDocumentInput!]!
    $tag: String
    $gitContext: GitContextInput
  ) {
    service(id: $id) {
      checkOperations(
        tag: $tag
        operations: $operations
        gitContext: $gitContext
      ) {
        changes {
          type
          code
          description
        }
      }
    }
  }
`;
