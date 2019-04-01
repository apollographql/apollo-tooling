import gql from "graphql-tag";

export const UPLOAD_AND_COMPOSE_PARTIAL_SCHEMA = gql`
  mutation UploadAndComposePartialSchema(
    $id: ID!
    $graphVariant: String!
    $name: String!
    $url: String!
    $sha: String!
    $activePartialSchema: PartialSchemaInput!
  ) {
    service(id: $id) {
      upsertImplementingServiceAndTriggerComposition(
        name: $name
        url: $url
        sha: $sha
        activePartialSchema: $activePartialSchema
        graphVariant: $graphVariant
      ) {
        schemaHash
      }
    }
  }
`;
