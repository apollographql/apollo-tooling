import gql from "graphql-tag";

export const GRAPH_INFO = gql`
  query CurrentGraphInformation($graphVariant: String!, $id: ID!) {
    service(id: $id) {
      mostRecentCompositionPublish(graphVariant: $graphVariant) {
        graphCompositionID
        errors {
          message
        }
        compositionConfig {
          implementingServiceLocations {
            name
            path
          }
        }
      }
      implementingServices(graphVariant: $graphVariant) {
        ... on FederatedImplementingServices {
          services {
            name
            updatedAt
            url
            revision
          }
        }
      }
      lastReportedAt(graphVariant: $graphVariant)
      schemaTag(tag: $graphVariant) {
        publishedAt
      }
      account {
        name
      }
    }
  }
`;
