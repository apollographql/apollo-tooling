import gql from "graphql-tag";

export const REMOVE_SERVICE_AND_COMPOSE = gql`
  mutation RemoveServiceAndCompose(
    $id: ID!
    $graphVariant: String!
    $name: String!
  ) {
    service(id: $id) {
      removeImplementingServiceAndTriggerComposition(
        graphVariant: $graphVariant
        name: $name
      ) {
        compositionConfig {
          implementingServiceLocations {
            name
            path
          }
        }
        errors {
          location {
            column
            line
          }
          message
        }
        warnings {
          location {
            column
            line
          }
          message
        }
        updatedGateway
      }
    }
  }
`;
