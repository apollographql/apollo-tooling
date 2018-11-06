import gql from "graphql-tag";
import { GraphQLDataSource } from "./GraphQLDataSource";
import { GraphQLRequest } from "apollo-link";

import { DefaultEngineConfig } from "../config";
import { CHECK_SCHEMA, CheckSchemaVariables } from "./operations/checkSchema";
import {
  UPLOAD_SCHEMA,
  UploadSchemaVariables
} from "./operations/uploadSchema";

import {
  CHECK_OPERATIONS,
  CheckOperationsVariables
} from "./operations/checkOperations";

import {
  REGISTER_OPERATIONS,
  RegisterOperationsVariables
} from "./operations/registerOperations";

// XXX move to its own file
const SCHEMA_TAGS_AND_FIELD_STATS = gql`
  query SchemaTagsAndFieldStats($id: ID!) {
    service(id: $id) {
      schemaTags {
        tag
      }
      stats(from: "-86400", to: "-0") {
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

export function noServiceError(service: string, endpoint?: string) {
  return `Could not find service ${service} from Engine at ${endpoint}. Please check your API key and service name`;
}

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
    // TODO(pass UI using this client (i.e. vscode, cli, etc))
    request.headers.clientName = "Apollo Language Server";
    // this is a generated id so we can change the name above as this becomes
    // more sophisticated. This id should stay with the base language server
    // so when we fix tthe TODO above, this can be retired
    request.headers.clientReferenceId = "146d29c0-912c-46d3-b686-920e52586be6";
    request.headers.clientVersion = require("../../package.json").version;
  }

  // ad-hoc typings
  // XXX fix typings on base package
  public async execute(options: GraphQLRequest) {
    return super.query(options.query, options).then(result => result || {});
  }

  // XXX can we use codegen for these types?
  public async checkSchema(variables: CheckSchemaVariables) {
    return this.execute({
      query: CHECK_SCHEMA,
      variables
    }).then(({ data, errors }) => {
      if (data && !data.service) {
        throw new Error(noServiceError(variables.id, this.baseURL));
      }
      // use error logger
      // if (errors) {
      //   throw new Error(errors);
      // }
      if (!data) {
        throw new Error("Error in request from Engine");
      }
      return data.service.checkSchema;
    });
  }

  public async uploadSchema(variables: UploadSchemaVariables) {
    return this.execute({
      query: UPLOAD_SCHEMA,
      variables
    }).then(({ data, errors }) => {
      if (data && !data.service) {
        throw new Error(noServiceError(variables.id, this.baseURL));
      }
      // use error logger
      // if (errors) {
      //   throw new Error(errors);
      // }
      if (!data) {
        throw new Error("Error in request from Engine");
      }
      return data.service.uploadSchema;
    });
  }

  public async checkOperations(variables: CheckOperationsVariables) {
    return this.execute({ query: CHECK_OPERATIONS, variables }).then(
      ({ data, errors }) => {
        if (data && !data.service) {
          throw new Error(noServiceError(variables.id, this.baseURL));
        }
        // use error logger
        // if (errors) {
        //   throw new Error(errors);
        // }
        if (!data) {
          throw new Error("Error in request from Engine");
        }
        return data.service.checkOperations;
      }
    );
  }

  public async registerOperations(variables: RegisterOperationsVariables) {
    return this.execute({ query: REGISTER_OPERATIONS, variables }).then(
      ({ data, errors }) => {
        if (data && !data.service) {
          throw new Error(noServiceError(variables.id, this.baseURL));
        }
        // use error logger
        // if (errors) {
        //   throw new Error(errors);
        // }
        if (!data) {
          throw new Error("Error in request from Engine");
        }
        return data.service.registerOperations;
      }
    );
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
