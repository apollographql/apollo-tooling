import { GraphQLDataSource } from "./GraphQLDataSource";
import { DefaultEngineConfig, getServiceFromKey } from "../config";
import { CHECK_SCHEMA } from "./operations/checkSchema";
import { UPLOAD_SCHEMA } from "./operations/uploadSchema";
import { VALIDATE_OPERATIONS } from "./operations/validateOperations";
import { REGISTER_OPERATIONS } from "./operations/registerOperations";
import { SCHEMA_TAGS_AND_FIELD_STATS } from "./operations/schemaTagsAndFieldStats";
import { UPLOAD_AND_COMPOSE_PARTIAL_SCHEMA } from "./operations/uploadAndComposePartialSchema";
import { CHECK_PARTIAL_SCHEMA } from "./operations/checkPartialSchema";
import { REMOVE_SERVICE_AND_COMPOSE } from "./operations/removeServiceAndCompose";
import { LIST_SERVICES } from "./operations/listServices";
import {
  ListServices,
  ListServicesVariables,
  CheckSchema,
  CheckSchemaVariables,
  UploadSchema,
  UploadSchemaVariables,
  UploadAndComposePartialSchema,
  UploadAndComposePartialSchemaVariables,
  RegisterOperations,
  RegisterOperationsVariables,
  ValidateOperations,
  ValidateOperationsVariables,
  SchemaTagsAndFieldStats,
  CheckPartialSchema,
  CheckPartialSchemaVariables,
  RemoveServiceAndCompose,
  RemoveServiceAndComposeVariables,
  CheckPartialSchema_service_checkPartialSchema,
} from "../graphqlTypes";

export interface ClientIdentity {
  name?: string;
  version?: string;
  referenceID?: string;
}

export type ServiceID = string;
export type ClientID = string;
export type SchemaTag = string;
export type ServiceIDAndTag = [ServiceID, SchemaTag?];
export type ServiceSpecifier = string;
export type FieldStats = Map<string, Map<string, number | null>>;

export function noServiceError(service: string | undefined, endpoint?: string) {
  return `Could not find graph ${
    service ? service : ""
  } from Apollo at ${endpoint}. Please check your API key and graph ID`;
}

export class ApolloEngineClient extends GraphQLDataSource {
  constructor(
    private engineKey: string,
    engineEndpoint: string = DefaultEngineConfig.endpoint,
    private clientIdentity?: ClientIdentity
  ) {
    super();
    this.baseURL = engineEndpoint;
  }

  // XXX fix typings on base package
  willSendRequest(request: any) {
    if (!request.headers) request.headers = {};
    request.headers["x-api-key"] = this.engineKey;
    if (this.clientIdentity && this.clientIdentity.name) {
      request.headers["apollo-client-name"] = this.clientIdentity.name;
      request.headers["apollo-client-reference-id"] =
        this.clientIdentity.referenceID;
      request.headers["apollo-client-version"] = this.clientIdentity.version;
      return;
    }

    // default values
    request.headers["apollo-client-name"] = "Apollo Language Server";
    request.headers["apollo-client-reference-id"] =
      "146d29c0-912c-46d3-b686-920e52586be6";
    request.headers["apollo-client-version"] =
      require("../../package.json").version;
  }

  public async listServices(variables: ListServicesVariables) {
    const result = await this.execute<ListServices>({
      document: LIST_SERVICES,
      variables,
    });

    if (!result.service) {
      throw new Error(noServiceError(variables.id, this.baseURL));
    }
    return result;
  }

  public async checkSchema(variables: CheckSchemaVariables) {
    const result = await this.execute<CheckSchema>({
      document: CHECK_SCHEMA,
      variables,
    });

    if (!result.service) {
      throw new Error(noServiceError(variables.id, this.baseURL));
    }
    return result.service.checkSchema;
  }

  public async uploadSchema(variables: UploadSchemaVariables) {
    const result = await this.execute<UploadSchema>({
      document: UPLOAD_SCHEMA,
      variables,
    });

    if (!result.service) {
      throw new Error(noServiceError(variables.id, this.baseURL));
    }
    return result.service.uploadSchema;
  }

  public async uploadAndComposePartialSchema(
    variables: UploadAndComposePartialSchemaVariables
  ) {
    const result = await this.execute<UploadAndComposePartialSchema>({
      document: UPLOAD_AND_COMPOSE_PARTIAL_SCHEMA,
      variables,
    });

    if (!result.service) {
      throw new Error(noServiceError(variables.id, this.baseURL));
    }

    if (
      !(
        result &&
        result.service &&
        result.service.upsertImplementingServiceAndTriggerComposition
      )
    ) {
      throw new Error("Error in response from Apollo");
    }
    return result.service.upsertImplementingServiceAndTriggerComposition;
  }

  public async checkPartialSchema(
    variables: CheckPartialSchemaVariables
  ): Promise<CheckPartialSchema_service_checkPartialSchema> {
    const result = await this.execute<CheckPartialSchema>({
      document: CHECK_PARTIAL_SCHEMA,
      variables,
    });
    if (result && !result.service) {
      throw new Error(noServiceError(variables.id, this.baseURL));
    }

    if (!(result && result.service)) {
      throw new Error("Error in response from Apollo");
    }
    return result.service.checkPartialSchema;
  }

  public async removeServiceAndCompose(
    variables: RemoveServiceAndComposeVariables
  ) {
    const result = await this.execute<RemoveServiceAndCompose>({
      document: REMOVE_SERVICE_AND_COMPOSE,
      variables,
    });

    if (!result || !result.service) {
      throw new Error("Error in response from Apollo");
    }

    return result.service.removeImplementingServiceAndTriggerComposition;
  }

  public async validateOperations(variables: ValidateOperationsVariables) {
    const result = await this.execute<ValidateOperations>({
      document: VALIDATE_OPERATIONS,
      variables,
    });

    if (result && !result.service) {
      throw new Error(noServiceError(variables.id, this.baseURL));
    }

    if (!(result && result.service)) {
      throw new Error("Error in response from Apollo");
    }

    return result.service.validateOperations.validationResults;
  }

  public async registerOperations(variables: RegisterOperationsVariables) {
    const result = await this.execute<RegisterOperations>({
      document: REGISTER_OPERATIONS,
      variables,
    });
    if (!result.service) {
      throw new Error(noServiceError(variables.id, this.baseURL));
    }

    if (!result.service.registerOperationsWithResponse) {
      throw new Error("Error in response from Apollo");
    }
    return result.service.registerOperationsWithResponse;
  }

  async loadSchemaTagsAndFieldStats(serviceID: string) {
    const result = await this.execute<SchemaTagsAndFieldStats>({
      document: SCHEMA_TAGS_AND_FIELD_STATS,
      variables: {
        id: serviceID,
      },
    });

    if (!result.service?.schemaTags) {
      throw new Error(
        "No service returned. Make sure your service name and API key match"
      );
    }

    const schemaTags: string[] = result.service.schemaTags.map(
      ({ tag }: { tag: string }) => tag
    );

    const fieldStats: FieldStats = new Map();

    result.service.stats.fieldStats.forEach((fieldStat) => {
      // Parse field "ParentType.fieldName:FieldType" into ["ParentType", "fieldName", "FieldType"]
      const [parentType = null, fieldName = null] = fieldStat.groupBy.field
        ? fieldStat.groupBy.field.split(/\.|:/)
        : [];

      if (!parentType || !fieldName) {
        return;
      }
      const fieldsMap =
        fieldStats.get(parentType) ||
        fieldStats.set(parentType, new Map()).get(parentType)!;

      fieldsMap.set(fieldName, fieldStat.metrics.fieldHistogram.durationMs);
    });

    return { schemaTags, fieldStats };
  }
}
