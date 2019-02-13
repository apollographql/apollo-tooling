import { IntrospectionSchema } from "graphql";
import gql from "graphql-tag";

export interface GitContextInput {
  commit: string;
  commiter?: string;
  message?: string;
  branch?: string;
  remoteUrl?: string;
}
export interface HistoricQueryParameters {
  from?: number;
  to?: number;
  queryCountThreshold?: number;
  queryCountThresholdPercentage?: number;
}
export interface CheckSchemaVariables {
  id: string;
  schema: IntrospectionSchema;
  tag?: string;
  gitContext?: GitContextInput;
  historicParameters?: HistoricQueryParameters;
  frontend?: string;
}

export const CHECK_SCHEMA = gql`
  mutation CheckSchema(
    $id: ID!
    $schema: IntrospectionSchemaInput!
    $tag: String
    $gitContext: GitContextInput
    $historicParameters: HistoricQueryParameters
    $frontend: String
  ) {
    service(id: $id) {
      checkSchema(
        proposedSchema: $schema
        baseSchemaTag: $tag
        gitContext: $gitContext
        historicParameters: $historicParameters
        frontend: $frontend
      ) {
        targetUrl
        diffToPrevious {
          type
          changes {
            type
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
