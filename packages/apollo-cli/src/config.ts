import { basename, dirname } from "path";

export interface EndpointConfig {
  url?: string; // main HTTP endpoint
  subscriptions?: string; // WS endpoint for subscriptions
  headers?: Object[]; // headers to send when performing operations
}

export interface ApolloConfig {
  projectName?: string;
  schema?: string; // path to JSON introspection, if not provided endpoint will be used
  endpoint?: EndpointConfig; // GraphQL endpoint URL, used to run queries and grab schema
  operations?: string[]; // glob path(s) to GraphQL operations (default: '**/*.graphql')
  excludedOperations?: string[]; // glob path(s) to GraphQL operation paths to ignore (default: 'node_modules/**')
  engineKey?: string; // Apollo Engine key
}

function loadEndpointConfig(obj: any): EndpointConfig {
  let withoutSubscriptions: EndpointConfig;
  if (typeof obj === "string") {
    withoutSubscriptions = {
      url: obj
    };
  } else {
    withoutSubscriptions = obj as EndpointConfig;
  }

  if (!withoutSubscriptions.subscriptions) {
    withoutSubscriptions.subscriptions = withoutSubscriptions.url!.replace(
      "http",
      "ws"
    );
  }

  return withoutSubscriptions;
}

export function loadConfig(obj: any, configFilePath: string): ApolloConfig {
  if (!obj.schema && !obj.endpoint) {
    throw new Error("No schema or endpoint specified!");
  }

  return {
    schema: obj.schema,
    endpoint: loadEndpointConfig(obj.endpoint),
    projectName: basename(dirname(configFilePath)),
    operations:
      typeof obj.operations === "string"
        ? [obj.operations]
        : obj.operations
          ? (obj.operations as string[])
          : ["**/*.graphql"],
    excludedOperations:
      typeof obj.excludedOperations === "string"
        ? [obj.excludedOperations]
        : obj.excludedOperations
          ? (obj.excludedOperations as string[])
          : [],
    engineKey: obj.engineKey
  };
}
