import { ApolloFederationInfoProvider } from "./base";
import {
  ApolloConfig,
  isClientConfig,
  isServiceConfig,
  isLocalServiceConfig
} from "../../config";

import { EndpointFederationInfoProvider } from "./endpoint";

export { ApolloFederationInfoProvider };

/**
 * TODO: remove federation info providers
 * Since _service now only is responsible for sdl, we can probably
 * remove all federation info providers (since they're just schema providers)
 */
export function federationInfoProviderFromConfig(
  config: ApolloConfig
): ApolloFederationInfoProvider {
  if (isServiceConfig(config)) {
    if (config.service.endpoint) {
      return new EndpointFederationInfoProvider(config.service.endpoint);
    }
    // if(config.service.localSchemaFile){
    //   return new
    // }
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
