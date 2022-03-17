import cosmiconfig from "cosmiconfig";
import { LoaderEntry } from "cosmiconfig";
import TypeScriptLoader from "@endemolshinegroup/cosmiconfig-typescript-loader";
import { resolve } from "path";
import { readFileSync, existsSync, lstatSync } from "fs";
import merge from "lodash.merge";
import {
  ApolloConfig,
  ApolloConfigFormat,
  DefaultConfigBase,
  DefaultClientConfig,
  DefaultServiceConfig,
  DefaultEngineConfig
} from "./config";
import { getServiceFromKey } from "./utils";
import URI from "vscode-uri";
import { Debug } from "../utilities";

// config settings
const MODULE_NAME = "apollo";
const defaultFileNames = [
  "package.json",
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.ts`,
  `${MODULE_NAME}.config.cjs`
];
const envFileNames = [".env", ".env.local"];

const loaders = {
  // XXX improve types for config
  ".json": (cosmiconfig as any).loadJson as LoaderEntry,
  ".js": (cosmiconfig as any).loadJs as LoaderEntry,
  ".cjs": (cosmiconfig as any).loadJs as LoaderEntry,
  ".ts": {
    async: TypeScriptLoader
  }
};

export const legacyKeyEnvVar = "ENGINE_API_KEY";
export const keyEnvVar = "APOLLO_KEY";

export interface LoadConfigSettings {
  // the current working directory to start looking for the config
  // config loading only works on node so we default to
  // process.cwd()

  // configPath and fileName are used in conjunction with one another.
  // i.e. /User/myProj/my.config.js
  //    => { configPath: '/User/myProj/', configFileName: 'my.config.js' }
  configPath?: string;

  // if a configFileName is passed in, loadConfig won't accept any other
  // configs as a fallback.
  configFileName?: string;

  // used when run by a `Workspace` where we _know_ a config file should be present.
  requireConfig?: boolean;

  // for CLI usage, we don't _require_ a config file for everything. This allows us to pass in
  // options to build one at runtime
  name?: string;
  type?: "service" | "client";
}

export type ConfigResult<T> = {
  config: T;
  filepath: string;
} | null;

// XXX load .env files automatically
export async function loadConfig({
  configPath,
  configFileName,
  requireConfig = false,
  name,
  type
}: LoadConfigSettings) {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: configFileName ? [configFileName] : defaultFileNames,
    loaders
  });

  // search can fail if a file can't be parsed (ex: a nonsense js file) so we wrap in a try/catch
  let loadedConfig;
  try {
    loadedConfig = (await explorer.search(configPath)) as ConfigResult<
      ApolloConfigFormat
    >;
  } catch (error) {
    return Debug.error(`A config file failed to load with options: ${JSON.stringify(
      arguments[0]
    )}.
    The error was: ${error}`);
  }

  if (configPath && !loadedConfig) {
    return Debug.error(
      `A config file failed to load at '${configPath}'. This is likely because this file is empty or malformed. For more information, please refer to: https://go.apollo.dev/t/config`
    );
  }

  if (loadedConfig && loadedConfig.filepath.endsWith("package.json")) {
    Debug.warning(
      'The "apollo" package.json configuration key will no longer be supported in Apollo v3. Please use the apollo.config.js file for Apollo project configuration. For more information, see: https://go.apollo.dev/t/config'
    );
  }

  if (requireConfig && !loadedConfig) {
    return Debug.error(
      `No Apollo config found for project. For more information, please refer to: https://go.apollo.dev/t/config`
    );
  }

  // add API key from the env
  let engineConfig = {},
    apiKey,
    nameFromKey;

  // loop over the list of possible .env files and try to parse for key
  // and service name. Files are scanned and found values are preferred
  // in order of appearance in `envFileNames`.
  envFileNames.forEach(envFile => {
    const dotEnvPath = configPath
      ? resolve(configPath, envFile)
      : resolve(process.cwd(), envFile);

    if (existsSync(dotEnvPath) && lstatSync(dotEnvPath).isFile()) {
      const env: { [key: string]: string } = require("dotenv").parse(
        readFileSync(dotEnvPath)
      );
      const legacyKey = env[legacyKeyEnvVar];
      const key = env[keyEnvVar];
      if (legacyKey && key) {
        Debug.warning(
          `Both ${legacyKeyEnvVar} and ${keyEnvVar} were found. ${keyEnvVar} will take precedence.`
        );
      }
      if (legacyKey) {
        Debug.warning(
          `[Deprecation warning] Setting the key via ${legacyKeyEnvVar} is deprecated and will not be supported in future versions. Please use ${keyEnvVar} instead.`
        );
      }
      apiKey = key || legacyKey;
    }
  });

  if (apiKey) {
    engineConfig = { engine: { apiKey } };
    nameFromKey = getServiceFromKey(apiKey);
  }

  // DETERMINE PROJECT TYPE
  // The CLI passes in a type when loading config. The editor extension
  // does not. So we determine the type of the config here, and use it if
  // the type wasn't explicitly passed in.
  let projectType: "client" | "service";
  if (type) projectType = type;
  else if (loadedConfig && loadedConfig.config.client) projectType = "client";
  else if (loadedConfig && loadedConfig.config.service) projectType = "service";
  else
    return Debug.error(
      "Unable to resolve project type. Please add either a client or service config. For more information, please refer to https://go.apollo.dev/t/config"
    );

  // DETERMINE SERVICE NAME
  // precedence: 1. (highest) config.js (client only) 2. name passed into loadConfig 3. name from api key
  let serviceName = name || nameFromKey;
  if (
    projectType === "client" &&
    loadedConfig &&
    loadedConfig.config.client &&
    typeof loadedConfig.config.client.service === "string"
  ) {
    serviceName = loadedConfig.config.client.service;
  }

  // if there wasn't a config loaded from a file, build one.
  // if there was a service name found in the env, merge it with the new/existing config object.
  // if the config loaded doesn't have a client/service key, add one based on projectType
  if (
    !loadedConfig ||
    serviceName ||
    !(loadedConfig.config.client || loadedConfig.config.service)
  ) {
    loadedConfig = {
      filepath: configPath || process.cwd(),
      config: {
        ...(loadedConfig && loadedConfig.config),
        ...(projectType === "client"
          ? {
              client: {
                ...DefaultConfigBase,
                ...(loadedConfig && loadedConfig.config.client),
                service: serviceName
              }
            }
          : {
              service: {
                ...DefaultConfigBase,
                ...(loadedConfig && loadedConfig.config.service),
                name: serviceName
              }
            })
      }
    };
  }

  let { config, filepath } = loadedConfig;

  // selectively apply defaults when loading the config
  // this is just the includes/excludes defaults.
  // These need to go on _all_ configs. That's why this is last.
  if (config.client) config = merge({ client: DefaultClientConfig }, config);
  if (config.service) config = merge({ service: DefaultServiceConfig }, config);
  if (engineConfig) config = merge(engineConfig, config);

  config = merge({ engine: DefaultEngineConfig }, config);

  return new ApolloConfig(config, URI.file(resolve(filepath)));
}
