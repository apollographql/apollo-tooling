import { GraphQLSchema } from "graphql";
import { ApolloConfig, SchemaDependency } from "./config";
import { fetchSchema, fetchSchemaFromEngine } from "./fetch-schema";

export async function loadSchema(
  dependency: SchemaDependency,
  config: ApolloConfig
): Promise<GraphQLSchema | undefined> {
  if (dependency.schema) {
    try {
      return await fetchSchema(
        { url: dependency.schema },
        config.projectFolder
      );
    } catch {}
  }

  if (dependency.endpoint && dependency.endpoint.url) {
    try {
      return await fetchSchema(dependency.endpoint, config.projectFolder);
    } catch {}
  }

  if (dependency.engineKey) {
    try {
      return await fetchSchemaFromEngine(
        dependency.engineKey,
        config.engineEndpoint
      );
    } catch {}
  }

  return undefined;
}
