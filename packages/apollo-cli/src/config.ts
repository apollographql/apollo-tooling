import { basename, dirname, join, relative } from "path";
import { fs, withGlobalFS } from "apollo-codegen-core/lib/localfs";

import * as fg from "glob";
import * as minimatch from "minimatch";

export interface EndpointConfig {
  url?: string; // main HTTP endpoint
  subscriptions?: string; // WS endpoint for subscriptions
  headers?: Object; // headers to send when performing operations
}

export interface ApolloConfig {
  projectFolder: string;
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
    preSubscriptions = (obj as EndpointConfig | undefined) ||
      { url: "http://localhost:4000/graphql" };
  }

  if (!preSubscriptions.subscriptions && preSubscriptions.url) {
    preSubscriptions.subscriptions = preSubscriptions.url!.replace(
      "http",
      "ws"
    );
  }

  return preSubscriptions;
}

export function loadConfig(obj: any, configDir: string): ApolloConfig {
  return {
    projectFolder: configDir,
    schema: obj.schema,
    endpoint: loadEndpointConfig(obj.endpoint),
    projectName: basename(configDir),
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
          : ["node_modules"],
    engineKey: obj.engineKey
  };
}

export function loadConfigFromFile(file: string): ApolloConfig {
  if (file.endsWith(".js")) {
    delete require.cache[require.resolve(file)];
    return loadConfig(require(file), dirname(file));
  } else if (file.endsWith("package.json")) {
    const apolloKey = JSON.parse(fs.readFileSync(file).toString()).apollo;
    if (apolloKey) {
      return loadConfig(apolloKey, dirname(file));
    } else {
      return loadConfig({}, dirname(file));
    }
  } else {
    throw new Error("Unsupported config file format");
  }
}

export function findAndLoadConfig(dir: string = process.cwd()): ApolloConfig {
  if (fs.existsSync(join(dir, "apollo.config.js"))) {
    return loadConfigFromFile(join(dir, "apollo.config.js"));
  } else if (fs.existsSync(join(dir, "package.json"))) {
    return loadConfigFromFile(join(dir, "package.json"));
  } else {
    return loadConfig({}, dir);
  }
}

export function getOperationPathsForConfig(config: ApolloConfig): string[] {
  return withGlobalFS(() => {
    return (config.operations || [])
      .flatMap(q => fg.sync(q, { root: config.projectFolder, absolute: true }))
      .filter(f => !(config.excludedOperations || []).some(p =>
        minimatch(relative(config.projectFolder, f), p)));
  });
}
