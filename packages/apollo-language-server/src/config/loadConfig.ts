import cosmiconfig from "cosmiconfig";
import { LoaderEntry } from "cosmiconfig";
import TypeScriptLoader from "@endemolshinegroup/cosmiconfig-typescript-loader";
import { resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { merge } from "lodash/fp";
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

// config settings
const MODULE_NAME = "apollo";
const defaultSearchPlaces = [
  "package.json",
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.ts`
];

// Based on order, a provided config file will take precedence over the defaults
const getSearchPlaces = (configFile?: string) => [
  ...(configFile ? [configFile] : []),
  ...defaultSearchPlaces
];

const loaders = {
  // XXX improve types for config
  ".json": (cosmiconfig as any).loadJson as LoaderEntry,
  ".js": (cosmiconfig as any).loadJs as LoaderEntry,
  ".ts": {
    async: TypeScriptLoader
  }
};

export interface LoadConfigSettings {
  // the current working directory to start looking for the config
  // config loading only works on node so we default to
  // process.cwd()
  configPath?: string;
  configFileName?: string;
  requireConfig?: boolean;
  name?: string;
  type?: "service" | "client";
}

export type ConfigResult<T> = {
  config: T;
  filepath: string;
  isEmpty?: boolean;
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
    searchPlaces: getSearchPlaces(configFileName),
    loaders
  });

  let loadedConfig = (await explorer.search(configPath)) as ConfigResult<
    ApolloConfigFormat
  >;

  if (configPath && !loadedConfig) {
    throw new Error(
      `A config file failed to load at '${configPath}'. This is likely because this file is empty or malformed. For more information, please refer to: https://bit.ly/2ByILPj`
    );
  }

  if (loadedConfig && loadedConfig.filepath.endsWith("package.json")) {
    console.warn(
      'The "apollo" package.json configuration key will no longer be supported in Apollo v3. Please use the apollo.config.js file for Apollo project configuration. For more information, see: https://bit.ly/2ByILPj'
    );
  }

  if (requireConfig && !loadedConfig) {
    throw new Error(
      `No Apollo config found for project. For more information, please refer to:
      https://bit.ly/2ByILPj`
    );
  }

  // add API to the env
  let engineConfig = {},
    nameFromKey;
  const dotEnvPath = configPath
    ? resolve(configPath, ".env")
    : resolve(process.cwd(), ".env");

  if (existsSync(dotEnvPath)) {
    const env: { [key: string]: string } = require("dotenv").parse(
      readFileSync(dotEnvPath)
    );

    if (env["ENGINE_API_KEY"]) {
      engineConfig = { engine: { apiKey: env["ENGINE_API_KEY"] } };
      nameFromKey = getServiceFromKey(env["ENGINE_API_KEY"]);
    }
  }

  let resolvedName = name || nameFromKey;

  // The CLI passes in a type when loading config. The editor extension
  // does not. So we determine the type of the config here, and use it if
  // the type wasn't explicitly passed in.
  let resolvedType: "client" | "service";
  if (type) {
    resolvedType = type;
    if (
      loadedConfig &&
      loadedConfig.config.client &&
      typeof loadedConfig.config.client.service === "string"
    ) {
      resolvedName = loadedConfig.config.client.service;
    }
  } else if (loadedConfig && loadedConfig.config.client) {
    resolvedType = "client";
    resolvedName =
      typeof loadedConfig.config.client.service === "string"
        ? loadedConfig.config.client.service
        : resolvedName;
  } else if (loadedConfig && loadedConfig.config.service) {
    resolvedType = "service";
  } else {
    throw new Error(
      "Unable to resolve project type. Please add either a client or service config. For more information, please refer to https://bit.ly/2ByILPj"
    );
  }

  // If there's a name passed in (from env/flag), it merges with the config file, to
  // overwrite either the client's service (if a client project), or the service's name.
  // if there's no config file, it uses the `DefaultConfigBase` to fill these in.
  if (!loadedConfig || resolvedName) {
    loadedConfig = {
      isEmpty: false,
      filepath: configPath || process.cwd(),
      config: {
        ...(loadedConfig && loadedConfig.config),
        ...(resolvedType === "client"
          ? {
              client: {
                ...DefaultConfigBase,
                ...(loadedConfig && loadedConfig.config.client),
                service: resolvedName
              }
            }
          : {
              service: {
                ...DefaultConfigBase,
                ...(loadedConfig && loadedConfig.config.service),
                name: resolvedName
              }
            })
      }
    };
  }

  let { config, filepath, isEmpty } = loadedConfig;

  if (isEmpty) {
    throw new Error(
      `Apollo config found at ${filepath} is empty. Please add either a client or service config`
    );
  }

  // selectivly apply defaults when loading the config
  if (config.client) config = merge({ client: DefaultClientConfig }, config);
  if (config.service) config = merge({ service: DefaultServiceConfig }, config);
  if (engineConfig) config = merge(engineConfig, config);

  config = merge({ engine: DefaultEngineConfig }, config);

  return new ApolloConfig(config, URI.file(resolve(filepath)));
}
