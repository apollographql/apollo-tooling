import {
  GraphQLSchemaProvider,
  SchemaChangeUnsubscribeHandler,
  SchemaResolveConfig
} from "./base";
import {
  ApolloConfig,
  isClientConfig,
  isServiceConfig,
  isLocalServiceConfig
} from "../../config";

import { IntrospectionSchemaProvider } from "./introspection";
import { EngineSchemaProvider } from "./engine";
import { FileSchemaProvider } from "./file";

export {
  GraphQLSchemaProvider,
  SchemaChangeUnsubscribeHandler,
  SchemaResolveConfig
};

export function schemaProviderFromConfig(
  config: ApolloConfig
): GraphQLSchemaProvider {
  if (isServiceConfig(config)) {
    if (config.service.localSchemaFile) {
      return new FileSchemaProvider({ path: config.service.localSchemaFile });
    }

    if (config.service.endpoint) {
      return new IntrospectionSchemaProvider(config.service.endpoint);
    }
  }

  if (isClientConfig(config)) {
    if (typeof config.client.service === "string") {
      return new EngineSchemaProvider(config);
    }

    if (config.client.service) {
      if (isLocalServiceConfig(config.client.service)) {
        return new FileSchemaProvider({
          path: config.client.service.localSchemaFile
        });
      }

      return new IntrospectionSchemaProvider(config.client.service);
    }
  }

  throw new Error("No provider was created for config");
}
