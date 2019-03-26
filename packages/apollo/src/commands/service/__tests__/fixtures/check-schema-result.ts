import {
  ChangeType,
  CheckSchema_service_checkSchema
} from "apollo-language-server/lib/graphqlTypes";

export const checkSchemaResult: CheckSchema_service_checkSchema = {
  __typename: "CheckSchemaResult",
  targetUrl:
    "https://engine-dev.apollographql.com/service/engine/checks?schemaTag=Detached%3A%20d664f715645c5f0bb5ad4f2260cd6cb8d19bbc68&schemaTagId=f9f68e7e-1b5f-4eab-a3da-1fd8cd681111&from=2019-03-26T22%3A25%3A12.887Z",
  diffToPrevious: {
    __typename: "SchemaDiff",
    type: ChangeType.FAILURE,
    affectedQueries: [
      { __typename: "AffectedQuery" },
      { __typename: "AffectedQuery" },
      { __typename: "AffectedQuery" }
    ],
    changes: [
      {
        __typename: "Change",
        type: ChangeType.FAILURE,
        code: "FIELD_CHANGED_TYPE",
        description:
          "`Change.argNode` changed type from `NamedIntrospectionArg` to `NamedIntrospectionValue`"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "ARG_REMOVED",
        description:
          "`ServiceMutation.registerOperations` arg `manifestVersion` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "ARG_REMOVED",
        description:
          "`ServiceMutation.uploadSchema` arg `historicParameters` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.FAILURE,
        code: "ARG_REMOVED",
        description:
          "`ServiceMutation.uploadSchema` arg `gitContext` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.FAILURE,
        code: "ARG_REMOVED",
        description: "`ServiceMutation.uploadSchema` arg `tag` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_REMOVED",
        description: "`SchemaDiff.numberOfCheckedOperations` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.FAILURE,
        code: "FIELD_REMOVED",
        description: "`Change.affectedClients` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_REMOVED",
        description: "`Change.affectedClientReferenceIds` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_REMOVED",
        description: "`Change.affectedClientIdVersionPairs` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.FAILURE,
        code: "ARG_REMOVED",
        description: "`ServiceMutation.uploadSchema` arg `schema` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_REMOVED",
        description: "`AffectedClient.clientReferenceId` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.FAILURE,
        code: "FIELD_REMOVED",
        description: "`NamedIntrospectionValue.printedType` was removed"
      },
      {
        __typename: "Change",
        type: ChangeType.FAILURE,
        code: "TYPE_REMOVED",
        description: "`NamedIntrospectionArg` removed"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_DEPRECATION_REMOVED",
        description: "`Change.description` is no longer deprecated"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_ADDED",
        description:
          "`ServiceMutation.deregisterSchemaNotificationChannel` was added"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_ADDED",
        description:
          "`ServiceMutation.registerSchemaNotificationChannel` was added"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_DEPRECATION_REMOVED",
        description: "`AffectedClient.clientId` is no longer deprecated"
      },
      {
        __typename: "Change",
        type: ChangeType.NOTICE,
        code: "FIELD_ADDED",
        description: "`Service.schemaNotificationChannels` was added"
      }
    ],
    validationConfig: {
      __typename: "SchemaDiffValidationConfig",
      from: "-86400",
      to: "-0",
      queryCountThreshold: 1,
      queryCountThresholdPercentage: 0
    }
  }
};
