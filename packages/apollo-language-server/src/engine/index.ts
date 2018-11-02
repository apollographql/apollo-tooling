import gql from "graphql-tag";
// XXX build and bundle typescript types
import { GraphQLDataSource } from "apollo-datasource-graphql/src";
import { GraphQLRequest } from "apollo-link";

import { DefaultEngineConfig } from "../config";

const SCHEMA_TAGS_AND_FIELD_STATS = gql`
  query SchemaTagsAndFieldStats($id: ID!) {
    service(id: $id) {
      schemaTags {
        tag
      }
      stats(from: "-3600", to: "-0") {
        fieldStats {
          groupBy {
            field
          }
          metrics {
            fieldHistogram {
              durationMs(percentile: 0.95)
            }
          }
        }
      }
    }
  }
`;

interface FieldStat {
  groupBy: {
    field: string;
  };
  metrics: {
    fieldHistogram: {
      durationMs: number;
    };
  };
}

export type ServiceID = string;
export type ClientID = string;
export type SchemaTag = string;
export type ServiceIDAndTag = [ServiceID, SchemaTag?];
export type ServiceSpecifier = string;
export type StatsWindowSize = number;
export type FieldStats = Map<string, Map<string, number>>;

export class ApolloEngineClient extends GraphQLDataSource {
  constructor(
    private engineKey: string,
    engineEndpoint: string = DefaultEngineConfig.endpoint
  ) {
    super();
    this.baseURL = engineEndpoint;
  }

  // XXX fix typings on base package
  willSendRequest(request: any) {
    if (!request.headers) request.headers = {};
    request.headers["x-api-key"] = this.engineKey;
  }

  // ad-hoc typings
  // XXX fix typings on base package
  public async execute(options: GraphQLRequest) {
    return super.query(options.query, options).then(result => result || {});
  }

  async loadSchemaTagsAndFieldStats(
    serviceID: string
  ): Promise<[SchemaTag[], FieldStats]> {
    const result = await this.execute({
      query: SCHEMA_TAGS_AND_FIELD_STATS,
      variables: {
        id: serviceID
      }
    });

    if (!result.data) {
      throw new Error();
    }

    const schemaTags: string[] = result.data.service.schemaTags.map(
      ({ tag }: { tag: string }) => tag
    );

    const fieldStats: FieldStats = new Map<string, Map<string, number>>();

    result.data.service.stats.fieldStats.forEach((fieldStat: FieldStat) => {
      // Parse field "ParentType.fieldName:FieldType" into ["ParentType", "fieldName", "FieldType"]
      const [parentType = null, fieldName = null] =
        fieldStat.groupBy.field.split(/\.|:/) || [];

      if (!parentType || !fieldName) {
        return;
      }
      const fieldsMap =
        fieldStats.get(parentType) ||
        fieldStats.set(parentType, new Map<string, number>()).get(parentType)!;

      fieldsMap.set(fieldName, fieldStat.metrics.fieldHistogram.durationMs);
    });

    return [schemaTags, fieldStats];
  }
}
