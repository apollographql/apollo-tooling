import {
  ApolloFederationInfoProvider
  // SchemaChangeUnsubscribeHandler,
  // SchemaResolveConfig
} from "./base";
import {
  ApolloConfig,
  isClientConfig,
  isServiceConfig,
  isLocalServiceConfig
} from "../../config";

import { EndpointFederationInfoProvider } from "./endpoint";
// import { EngineSchemaProvider } from "./engine";
// import { FileSchemaProvider } from "./file";
// import { ClientIdentity } from "../../engine";

export {
  ApolloFederationInfoProvider
  // SchemaChangeUnsubscribeHandler,
  // SchemaResolveConfig
};

export function federationInfoProviderFromConfig(
  config: ApolloConfig
  // clientIdentity?: ClientIdentity // engine provider needs this
): ApolloFederationInfoProvider {
  if (isServiceConfig(config)) {
    // if (config.service.localSchemaFile) {
    //   return new FileSchemaProvider({ path: config.service.localSchemaFile });
    // }
    if (config.service.endpoint) {
      return new EndpointFederationInfoProvider(config.service.endpoint);
    }
    throw new Error(
      "You must provide a service endpoint to use the federation info provider"
    );
  }

  if (isClientConfig(config)) {
    throw new Error(
      "No federation info provider was created, because client projects are unsupported. For more information, please refer to https://bit.ly/2ByILPj"
    );
  }

  throw new Error(
    "No federation info provider was created, because the project type was unable to be resolved from your config. Please add a service config to use the SDL provider. For more information, please refer to https://bit.ly/2ByILPj"
  );
}
