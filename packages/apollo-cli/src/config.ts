import { basename, dirname } from "path";

export interface ApolloConfig {
  schema?: string;
  endpoint?: string;
  subscriptionEndpoint?: string;
  projectName: string;
  queries: string | string[];
  engineKey?: string;
}

export function loadConfig(obj: any, configFilePath: string): ApolloConfig {
  if (!obj.schema && !obj.endpoint) {
    throw new Error("No schema or endpoint specified!");
  }

  return {
    schema: (obj.schema || obj.endpoint) as string,
    endpoint: obj.endpoint,
    subscriptionEndpoint:
      obj.subscriptionEndpoint || obj.endpoint.replace("http", "ws"),
    projectName: basename(dirname(configFilePath)),
    queries:
      typeof obj.queries === "string"
        ? obj.queries
        : obj.queries
          ? (obj.queries as string[])
          : ["**/*.graphql"],
    engineKey: obj.engineKey
  };
}
