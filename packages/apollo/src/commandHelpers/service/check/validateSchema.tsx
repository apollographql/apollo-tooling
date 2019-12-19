import { GraphQLProject, ApolloConfig } from "apollo-language-server";
import { Status } from "../../Status";
import { introspectionFromSchema } from "graphql";
import {
  IntrospectionSchemaInput,
  CheckSchemaVariables
} from "apollo-language-server/lib/graphqlTypes";
import { validateHistoricParams } from "../../../utils";
import { gitInfo } from "../../../git";
import debugLibrary from "debug";

const debug = debugLibrary("apollo:service:check:validateSchema");

/**
 *
 * Awesome explanation of what's happening
 */
export async function validateSchema({
  config,
  frontend,
  graphID,
  /**
   * this is the project
   */
  project,
  queryCountThreshold,
  queryCountThresholdPercentage,
  graphVariant,
  validationPeriod
}: {
  config: ApolloConfig;
  frontend: string;
  graphID: string;
  project: GraphQLProject;
  graphVariant: string;
} & Parameters<typeof validateHistoricParams>[0]) {
  const schema = await project.resolveSchema({ tag: config.tag });
  if (!schema) {
    new Error("Failed to resolve schema");
  }

  const schemaCheckSchemaVariables = {
    schema: introspectionFromSchema(schema).__schema as IntrospectionSchemaInput
  };

  const historicParameters = validateHistoricParams({
    validationPeriod,
    queryCountThreshold,
    queryCountThresholdPercentage
  });

  const variables = {
    id: graphID!,
    tag: graphVariant,
    gitContext: await gitInfo(() => {}),
    frontend,
    ...(historicParameters && { historicParameters }),
    ...schemaCheckSchemaVariables
  };

  debug(
    "call graphQL project.engine.checkSchema with variables %s",
    JSON.stringify(variables)
  );

  // TODO: Replace this with an apollo client query
  return project.engine.checkSchema(variables);
}
