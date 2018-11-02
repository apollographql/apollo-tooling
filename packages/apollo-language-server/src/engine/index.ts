import gql from "graphql-tag";
import { engineLink } from "apollo/lib/engine";
import { toPromise, execute } from "apollo-link";

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
export type ServiceSpecififerTuple = [ServiceID, SchemaTag?];
export type ServiceSpecififer = string;
export type StatsWindowSize = number;
export type FieldStats = Map<string, Map<string, number>>;

export class ApolloEngineClient {
  constructor(private engineKey: string, private engineEndpoint?: string) {}

  async loadSchemaTagsAndFieldStats(
    serviceID: string
  ): Promise<[SchemaTag[], FieldStats]> {
    const result = await toPromise(
      execute(engineLink, {
        query: SCHEMA_TAGS_AND_FIELD_STATS,
        variables: {
          id: serviceID
        },
        context: {
          headers: { ["x-api-key"]: this.engineKey },
          ...(this.engineEndpoint && { uri: this.engineEndpoint })
        }
      })
    );

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
