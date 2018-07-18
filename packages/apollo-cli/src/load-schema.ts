import { ApolloConfig } from "./config";
import { fetchSchema, fetchSchemaFromEngine } from "./fetch-schema";

export async function loadSchema(config: ApolloConfig) {
  if (config.schema) {
    return await fetchSchema({ url: config.schema });
  } else if (config.endpoint && config.endpoint.url) {
    return await fetchSchema(config.endpoint);
  } else if (config.engineKey) {
    return await fetchSchemaFromEngine(config.engineKey, undefined);
  } else {
    return undefined;
  }
}
