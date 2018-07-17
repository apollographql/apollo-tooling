import { basename, dirname, join } from "path";
import { fs } from "apollo-codegen-core/lib/localfs";

export interface EndpointConfig {
  url?: string; // main HTTP endpoint
  subscriptions?: string; // WS endpoint for subscriptions
  headers?: Object; // headers to send when performing operations
}

export interface ApolloConfig {
  projectName?: string;
  schema?: string; // path to JSON introspection, if not provided endpoint will be used
  endpoint?: EndpointConfig; // GraphQL endpoint URL, used to run queries and grab schema
  operations: string[]; // glob path(s) to GraphQL operations (default: '**/*.graphql')
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
    preSubscriptions = (obj || {}) as EndpointConfig;
  }

  if (!preSubscriptions.subscriptions && preSubscriptions.url) {
    preSubscriptions.subscriptions = preSubscriptions.url!.replace(
      "http",
      "ws"
    );
  }

  return preSubscriptions;
}

export function loadConfig(obj: any, configFilePath: string): ApolloConfig {
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

export function loadConfigFromFile(file: string): ApolloConfig | undefined {
  if (file.endsWith(".js")) {
    delete require.cache[require.resolve(file)];
    return loadConfig(require(file), file);
  } else if (file.endsWith("package.json")) {
    const apolloKey = JSON.parse(fs.readFileSync(file).toString()).apollo;
    if (apolloKey) {
      return loadConfig(apolloKey, file);
    } else {
      return undefined;
    }
  } else {
    return undefined;
  }
}

export function findAndLoadConfig(dir: string): ApolloConfig | undefined {
  if (fs.existsSync(join(dir, "apollo.config.js"))) {
    return loadConfigFromFile(join(dir, "apollo.config.js"));
  } else if (fs.existsSync(join(dir, "package.json"))) {
    return loadConfigFromFile(join(dir, "package.json"));
  } else {
    return undefined;
  }
}
