import cosmiconfig, { LoaderResult } from "cosmiconfig";
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
import { getGraphInfo, getGraphIdFromKey, GraphInfo } from "./utils";
import URI from "vscode-uri";
import { Debug } from "../utilities";
import { load } from "nock";
import { DeepPartial } from "apollo-env";

// config settings
const MODULE_NAME = "apollo";
const defaultFileNames = [
  "package.json",
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.ts`
];
const envFileNames = [".env", ".env.local"];

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

  // configPath and fileName are used in conjunction with one another.
  // i.e. /User/myProj/my.config.js
  //    => { configPath: '/User/myProj/', configFileName: 'my.config.js' }
  configPath?: string;

  // if a configFileName is passed in, loadConfig won't accept any other
  // configs as a fallback.
  configFileName?: string;

  // used when run by a `Workspace` where we _know_ a config file should be present.
  requireConfig?: boolean;
}

type NotNullConfigResult<T> = {
  config: T;
  filepath: string;
};

export type ConfigResult<T> = NotNullConfigResult<T> | null;

export function loadConfigWithDefaults(
  loadedConfig: Pick<
    NotNullConfigResult<DeepPartial<ApolloConfigFormat>>,
    "config"
  > | null,
  graphInfo: GraphInfo,
  configPath?: string,
  apiKey?: string
): ApolloConfig {
  if (!graphInfo.graphId) {
    console.warn("Graph is not specified from either Apollo config or env.");
  }
  const graphId = graphInfo.graphId;

  const configWithDefaults = {
    ...(loadedConfig && loadedConfig.config),
    client: merge(
      DefaultConfigBase,
      DefaultClientConfig,
      graphId
        ? {
            service: `${graphId}@${graphInfo.clientGraphVariant}`,
            graphId
          }
        : {},
      loadedConfig && loadedConfig.config.client
    ),
    service: merge(
      DefaultConfigBase,
      DefaultServiceConfig,
      graphId
        ? {
            name: `${graphId}@${graphInfo.serviceGraphVariant}`,
            graphId
          }
        : {},
      loadedConfig && loadedConfig.config.service
    ),
    engine: merge(
      DefaultEngineConfig,
      loadedConfig && loadedConfig.config.engine,
      { apiKey }
    )
  };

  return new ApolloConfig(
    configWithDefaults,
    URI.file(resolve(configPath || process.cwd()))
  );
}

// XXX load .env files automatically
export async function loadConfig({
  configPath,
  configFileName,
  requireConfig = false
}: LoadConfigSettings): Promise<ApolloConfig | void> {
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
      `A config file failed to load at '${configPath}'. This is likely because this file is empty or malformed. For more information, please refer to: https://bit.ly/2ByILPj`
    );
  }

  if (loadedConfig && loadedConfig.filepath.endsWith("package.json")) {
    Debug.warning(
      'The "apollo" package.json configuration key will no longer be supported in Apollo v3. Please use the apollo.config.js file for Apollo project configuration. For more information, see: https://bit.ly/2ByILPj'
    );
  }

  if (requireConfig && !loadedConfig) {
    return Debug.error(
      `No Apollo config found for project. For more information, please refer to:
      https://bit.ly/2ByILPj`
    );
  }

  // add API key from the env
  let apiKey, graphIdFromKey;

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
      if (env["ENGINE_API_KEY"]) {
        apiKey = env["ENGINE_API_KEY"];
      }
    }
  });

  if (apiKey) {
    graphIdFromKey = getGraphIdFromKey(apiKey);
  }

  // DETERMINE GRAPH ID
  // If there is a graph identified in either the client or the service keys of the config, it will take
  // precedence, and we rely on `getGraphId` to verify that these two match.
  const graphInfo = getGraphInfo(
    loadedConfig ? loadedConfig.config : undefined
  );

  if (!graphInfo.graphId && graphIdFromKey) {
    graphInfo.graphId = graphIdFromKey;
  }

  if (
    graphIdFromKey &&
    graphInfo.graphId &&
    graphInfo.graphId !== graphIdFromKey
  ) {
    throw new Error(
      `Graph specified in configuration does not match environment key. Please provide a matching " +
        "graph-level API token or use a personal user token.\n graphId: { key: ${graphIdFromKey}, config: ${graphInfo.graphId} }`
    );
  }

  return loadConfigWithDefaults(loadedConfig, graphInfo, configPath, apiKey);
}
