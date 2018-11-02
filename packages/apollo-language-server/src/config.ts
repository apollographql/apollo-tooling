import * as cosmiconfig from "cosmiconfig";
import { LoaderEntry } from "cosmiconfig";
import TypeScriptLoader from "@endemolshinegroup/cosmiconfig-typescript-loader";
import { defaultsDeep } from "lodash/fp";

import {
  ServiceID,
  ServiceSpecifier,
  ClientID,
  StatsWindowSize,
  ServiceIDAndTag
} from "./engine";

// TypeScript util requiring an optional field
export type WithRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;

export interface EngineStatsWindow {
  to: number;
  from: number;
}

export const DefaultEngineStatsWindow = {
  to: -0,
  from: -86400 // one day
};

export interface HistoricalEngineStatsWindow extends EngineStatsWindow {}

export type EndpointURI = string;
export interface RemoteServiceConfig {
  name: ServiceID;
  url: EndpointURI;
  headers?: { [key: string]: string };
  skipSSLValidation?: boolean;
}

export interface EngineConfig {
  endpoint?: EndpointURI;
  frontend?: EndpointURI;
  readonly engineApiKey?: string;
}

export const DefaultEngineConfig = {
  endpoint: "https://engine-graphql.apollographql.com/api/graphql",
  frontend: "https://engine.apollographql.com"
};

export const DefaultConfigBase = {
  includes: ["**/*.(ts|js|graphql)"],
  excludes: ["**/node_modules", "**/__tests__"]
};

export interface ConfigBase {
  includes: string[];
  excludes: string[];
}

export interface ClientConfig extends ConfigBase {
  // service linking
  service: ServiceSpecifier | RemoteServiceConfig;
  // client identity
  name?: ClientID;
  referenceID?: string;
  // client schemas
  clientOnlyDirectives?: string[];
  clientSchemaDirectives?: string[];

  tagName?: string;
  // stats window config
  statsWindow: StatsWindowSize;
}

export const DefaultClientConfig = {
  ...DefaultConfigBase,
  tagName: "gql",
  clientOnlyDirectives: ["@connection", "@type"],
  clientSchemaDirectives: ["@client", "@rest"],
  statsWindow: DefaultEngineStatsWindow
};

export interface ServiceConfig extends ConfigBase {
  name: string;
  endpoint?: Exclude<RemoteServiceConfig, "name">;
  localSchemaFile?: string;
}

export const DefaultServiceConfig = {
  ...DefaultConfigBase,
  endpoint: {
    url: "http://localhost:4000/graphql"
  }
};

export interface ConfigBaseFormat {
  client?: ClientConfig;
  service?: ServiceConfig;
  engine?: EngineConfig;
}

export type ClientConfigFormat = Exclude<
  WithRequired<ConfigBaseFormat, "client">,
  "service"
>;

export type ServiceConfigFormat = Exclude<
  WithRequired<ConfigBaseFormat, "service">,
  "client"
>;

export type ApolloConfigFormat =
  | WithRequired<ConfigBaseFormat, "client">
  | WithRequired<ConfigBaseFormat, "service">;

// config settings
const MODULE_NAME = "apollo";
const searchPlaces = [
  "package.json",
  `${MODULE_NAME}.config.js`,
  `${MODULE_NAME}.config.ts`
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
  cwd: string;
}

export type ConfigResult<Config> = {
  config: Config;
  filepath: string;
  isEmpty?: boolean;
} | null;

// XXX load .env files automatically
export const loadConfig = async ({
  cwd
}: LoadConfigSettings): Promise<ConfigResult<ApolloConfigFormat>> => {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces,
    loaders
  });

  const loadedConfig = (await explorer.search(cwd)) as ConfigResult<
    ApolloConfigFormat
  >;

  if (!loadedConfig) return null;
  let { config, filepath, isEmpty } = loadedConfig;

  if (isEmpty) {
    throw new Error(
      `Apollo config found at ${filepath} is empty. Please add either a client or service config`
    );
  }

  // selectivly apply defaults when loading the config
  if (config.client)
    config = defaultsDeep(config, { client: DefaultClientConfig });
  if (config.service)
    config = defaultsDeep(config, { service: DefaultServiceConfig });
  config = defaultsDeep(config, DefaultEngineConfig);

  return { config, filepath, isEmpty };
};

// XXX change => to named functions
export const isClient = (
  config: ApolloConfigFormat
): config is ClientConfigFormat => !!config.client;

export const isService = (
  config: ApolloConfigFormat
): config is ServiceConfigFormat => !!config.service;

// take a config with multiple project types and return
// an array of individual types
export const projectsFromConfig = (
  config: ApolloConfigFormat
): Array<ClientConfigFormat | ServiceConfigFormat> => {
  const configs = [];
  const { client, service, ...rest } = config;
  // XXX use casting detection
  if (client) configs.push({ client, ...rest });
  if (service) configs.push({ service, ...rest });
  return configs;
};

export const parseServiceSpecificer = (
  specifier: ServiceSpecifier
): ServiceIDAndTag => {
  const [id, tag] = specifier.split("@").map(x => x.trim());
  // typescript hinting
  return [id, tag];
};

export const getServiceName = (config: ApolloConfigFormat): string => {
  if (config.service) return config.service.name;
  if (typeof (config.client!.service as ServiceSpecifier) === "string") {
    return parseServiceSpecificer(config.client!
      .service as ServiceSpecifier)[0];
  }

  return (config.client!.service as RemoteServiceConfig).name;
};

export const selectProjectFromConfig = ({
  client,
  service
}: ApolloConfigFormat): ClientConfig | ServiceConfig => client || service!;
