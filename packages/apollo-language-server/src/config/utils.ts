import {
  ApolloConfig,
  ClientConfig,
  ClientServiceConfig,
  LocalServiceConfig,
  ServiceConfig,
  ApolloConfigFormat
} from "./config";
import { ServiceSpecifier, ServiceIDAndTag } from "../engine";
import URI from "vscode-uri";

export function isClientConfig(config: ApolloConfig): config is ClientConfig {
  return config.isClient;
}

export function isLocalServiceConfig(
  config: ClientServiceConfig
): config is LocalServiceConfig {
  return !!(config as LocalServiceConfig).localSchemaFile;
}

export function isServiceConfig(config: ApolloConfig): config is ServiceConfig {
  return config.isService;
}

export function getServiceFromKey(key: string | undefined) {
  if (key) {
    const [type, service] = key.split(":");
    if (type === "service") return service;
  }
  return;
}

export function getServiceName(config: ApolloConfigFormat) {
  if (config.service) return config.service.name;
  if (config.client) {
    if (typeof config.client.service === "string") {
      return parseServiceSpecificer(config.client
        .service as ServiceSpecifier)[0];
    }
    return config.client.service && config.client.service.name;
  } else {
    return undefined;
  }
}

export function parseServiceSpecificer(specifier: ServiceSpecifier) {
  const [id, tag] = specifier.split("@").map(x => x.trim());
  return [id, tag] as ServiceIDAndTag;
}

// take a config with multiple project types and return
// an array of individual types
export function projectsFromConfig(
  config: ApolloConfigFormat,
  configURI?: URI
) {
  const configs = [];
  const { client, service } = config;
  if (client) configs.push(new ClientConfig(config, configURI));
  if (service) configs.push(new ServiceConfig(config, configURI));
  return configs;
}
