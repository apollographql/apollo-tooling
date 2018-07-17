import { basename, dirname, join } from "path";
import { fs } from "../node_modules/apollo-codegen-core/lib/localfs";
import { readFileSync } from "fs";

export interface EndpointConfig {
  url?: string; // main HTTP endpoint
  subscriptions?: string; // WS endpoint for subscriptions
  headers?: Object; // headers to send when performing operations
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
  let preSubscriptions: EndpointConfig;
  if (typeof obj === "string") {
    preSubscriptions = {
      url: obj
    };
  } else {
    preSubscriptions = obj as EndpointConfig;
  }

  if (!preSubscriptions.subscriptions) {
    preSubscriptions.subscriptions = preSubscriptions.url!.replace(
      "http",
      "ws"
    );
  }

  return preSubscriptions;
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

export function findAndLoadConfig(dir: string): ApolloConfig | undefined {
  if (fs.existsSync(join(dir, "apollo.config.js"))) {
    const configFile = join(dir, "apollo.config.js");
    delete require.cache[require.resolve(configFile)];
    return loadConfig(require(configFile), configFile);
  } else if (fs.existsSync(join(dir, "package.json"))) {
    const configFile = join(dir, "package.json");
    const apolloKey = JSON.parse(readFileSync(configFile).toString()).apollo;
    if (apolloKey) {
      return loadConfig(apolloKey, configFile);
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}
