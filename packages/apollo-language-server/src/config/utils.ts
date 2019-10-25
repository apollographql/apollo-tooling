import {
  ApolloConfig,
  ApolloConfigFormat,
  ClientProjectConfig,
  ClientServiceConfig,
  LocalServiceConfig,
  ServiceProjectConfig
} from "./config";
import { ServiceIDAndTag, ServiceSpecifier } from "../engine";
import { DeepPartial } from "apollo-env";

export function isClientConfig(
  config: ApolloConfig
): config is ClientProjectConfig {
  return config.isClient;
}

// checks the `config.client.service` object for a localSchemaFile
export function isLocalServiceConfig(
  config: ClientServiceConfig
): config is LocalServiceConfig {
  return !!(config as LocalServiceConfig).localSchemaFile;
}

export function isServiceConfig(
  config: ApolloConfig
): config is ServiceProjectConfig {
  return config.isService;
}

export function getGraphIdFromKey(key?: string): string | undefined {
  if (key) {
    const [type, service] = key.split(":");
    if (type === "service") return service;
  }
  return;
}

export interface GraphInfo {
  graphId?: string;
  serviceGraphVariant: string;
  clientGraphVariant: string;
}

export function getGraphInfo(
  config?: DeepPartial<ApolloConfigFormat>
): GraphInfo {
  let serviceGraphId: string | undefined, clientGraphId: string | undefined;
  let serviceGraphVariant = "current";
  let clientGraphVariant = "current";
  if (!config) {
    return {
      serviceGraphVariant,
      clientGraphVariant
    };
  }
  if (config.service && config.service.name) {
    if (config.service.name.indexOf("@") > 0) {
      [serviceGraphId, serviceGraphVariant = "current"] = parseServiceSpecifier(
        config.service.name
      );
    } else {
      serviceGraphId = config.service.name;
    }
  }
  if (config.client) {
    if (typeof config.client.service === "string") {
      [clientGraphId, clientGraphVariant = "current"] = parseServiceSpecifier(
        config.client.service
      );
    } else {
      clientGraphId = config.client.service && config.client.service.name;
    }
  }
  if (serviceGraphId && clientGraphId && serviceGraphId !== clientGraphId) {
    throw new Error(
      `Unsupported configuration: service and client configs must refer to the same graph.\nservice:${serviceGraphId}, client:${clientGraphId}`
    );
  } else if (!clientGraphId && !serviceGraphId) {
    return { clientGraphVariant, serviceGraphVariant };
  } else {
    return {
      graphId: serviceGraphId || clientGraphId,
      serviceGraphVariant,
      clientGraphVariant
    };
  }
}

export function parseServiceSpecifier(specifier: ServiceSpecifier) {
  const trimmed = specifier.trim();
  const [id, tag] = trimmed.split("@");
  return [id, tag];
}
