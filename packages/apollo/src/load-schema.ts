import { IntrospectionSchema } from "graphql";
import { ApolloConfig, SchemaDependency } from "./config";
import { fetchSchema, fetchSchemaFromEngine } from "./fetch-schema";

export async function loadSchema(
  dependency: SchemaDependency,
  config: ApolloConfig
): Promise<IntrospectionSchema | undefined> {
  if (dependency.schema) {
    return await fetchSchema({ url: dependency.schema }, config.projectFolder);
  } else if (dependency.endpoint && dependency.endpoint.url) {
    return await fetchSchema(dependency.endpoint, config.projectFolder);
  } else if (dependency.engineKey) {
    return await fetchSchemaFromEngine(
      dependency.engineKey,
      config.engineEndpoint
    );
  } else {
    return undefined;
  }
}
