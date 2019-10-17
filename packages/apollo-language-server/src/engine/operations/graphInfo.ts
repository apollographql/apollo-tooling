import gql from "graphql-tag";

export const GRAPH_INFO = gql`
  query GraphInfo($id: ID!, $graphVariant: String!) {
    service(id: $id) {
      mostRecentCompositionPublish(graphVariant: $graphVariant) {
        __typename
        graphCompositionID
        compositionConfig {
          implementingServiceLocations {
            name
          }
        }
        errors {
          message
        }
        updatedGateway
      }
    }
  }
`;
