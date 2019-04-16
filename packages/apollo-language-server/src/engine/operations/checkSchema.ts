import gql from "graphql-tag";

export const CHECK_SCHEMA = gql`
  mutation CheckSchema(
    $id: ID!
    $schema: IntrospectionSchemaInput
    $schemaHash: String
    $tag: String
    $gitContext: GitContextInput
    $historicParameters: HistoricQueryParameters
    $frontend: String
  ) {
    service(id: $id) {
      checkSchema(
        proposedSchema: $schema
        proposedSchemaHash: $schemaHash
        baseSchemaTag: $tag
        gitContext: $gitContext
        historicParameters: $historicParameters
        frontend: $frontend
      ) {
        targetUrl
        diffToPrevious {
          type: severity
          affectedClients {
            __typename
          }
          affectedQueries {
            __typename
          }
          numberOfCheckedOperations
          changes {
            type: severity
            code
            description
          }
          validationConfig {
            from
            to
            queryCountThreshold
            queryCountThresholdPercentage
          }
        }
      }
    }
  }
`;
