import { SchemaDependency } from "./config";
import { fetchSchema, fetchSchemaFromEngine } from "./fetch-schema";

export async function loadSchema(dependency: SchemaDependency) {
  if (dependency.schema) {
    return await fetchSchema({ url: dependency.schema });
  } else if (dependency.endpoint && dependency.endpoint.url) {
    return await fetchSchema(dependency.endpoint);
  } else if (dependency.engineKey) {
    return await fetchSchemaFromEngine(dependency.engineKey, undefined);
  } else {
    return undefined;
  }
}
