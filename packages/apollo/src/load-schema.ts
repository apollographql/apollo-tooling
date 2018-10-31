import { IntrospectionSchema } from "graphql";
import { ApolloConfig, SchemaDependency } from "./config";
import { fetchSchema, fetchSchemaFromEngine } from "./fetch-schema";

export async function loadSchema({
  dependency,
  config,
  tag
}: {
  dependency: SchemaDependency;
  config: ApolloConfig;
  tag?: string;
}): Promise<IntrospectionSchema | undefined> {
  if (tag && dependency.engineKey) {
    return await fetchSchemaFromEngine({
      apiKey: dependency.engineKey,
      tag,
      customEngine: config.engineEndpoint
    });
  }

  if (dependency.schema) {
    return await fetchSchema({ url: dependency.schema }, config.projectFolder);
  } else if (dependency.endpoint && dependency.endpoint.url) {
    return await fetchSchema(dependency.endpoint, config.projectFolder);
  } else if (dependency.engineKey) {
    return await fetchSchemaFromEngine({
      apiKey: dependency.engineKey,
      customEngine: config.engineEndpoint
    });
  } else {
    return undefined;
  }
}
