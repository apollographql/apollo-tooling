import {
  GraphQLSchemaProvider,
  SchemaChangeUnsubscribeHandler,
  SchemaResolveConfig
} from "./base";
import { ApolloConfigFormat, isClient, isService } from "../../config";

import { IntrospectionSchemaProvider } from "./introspection";
import { EngineSchemaProvider } from "./engine";
import { FileSchemaProvider } from "./file";

export {
  GraphQLSchemaProvider,
  SchemaChangeUnsubscribeHandler,
  SchemaResolveConfig
};

export function schemaProviderFromConfig(
  config: ApolloConfigFormat
): GraphQLSchemaProvider {
  if (isService(config)) {
    if (config.service.localSchemaFile) {
      return new FileSchemaProvider({ path: config.service.localSchemaFile });
    }
    if (config.service.endpoint) {
      return new IntrospectionSchemaProvider(config.service.endpoint);
    }
  }

  if (isClient(config)) {
    if (typeof config.client.service === "string") {
      return new EngineSchemaProvider(config);
    }
    return new IntrospectionSchemaProvider(config.client.service);
  }
  throw new Error("No provider was created for config");
}
