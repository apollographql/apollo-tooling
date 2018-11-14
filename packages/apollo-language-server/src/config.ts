import * as cosmiconfig from "cosmiconfig";
import { LoaderEntry } from "cosmiconfig";
import TypeScriptLoader from "@endemolshinegroup/cosmiconfig-typescript-loader";
import { parse, resolve } from "path";
import { readFileSync, existsSync } from "fs";
import { merge } from "lodash/fp";

import {
  ServiceID,
  ServiceSpecifier,
  ClientID,
  StatsWindowSize,
  ServiceIDAndTag
} from "./engine";

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

export interface LocalServiceConfig {
  name: ServiceID;
  localSchemaFile: string;
}

export interface EngineConfig {
  endpoint?: EndpointURI;
  frontend?: EndpointURI;
  readonly apiKey?: string;
}

export const DefaultEngineConfig = {
  endpoint: "https://engine-graphql.apollographql.com/api/graphql",
  frontend: "https://engine.apollographql.com"
};

export const DefaultConfigBase = {
  includes: ["src/**/*.{ts,tsx,js,jsx,graphql}"],
  excludes: ["**/node_modules", "**/__tests__"]
};

export interface ConfigBase {
  includes: string[];
  excludes: string[];
}

export type ClientServiceConfig = RemoteServiceConfig | LocalServiceConfig;

export interface ClientConfigFormat extends ConfigBase {
  // service linking
  service?: ServiceSpecifier | ClientServiceConfig;
  // client identity
  name?: ClientID;
  referenceID?: string;
  version?: string;
  // client schemas
  clientOnlyDirectives?: string[];
  clientSchemaDirectives?: string[];
  addTypename?: boolean;

  tagName?: string;
  // stats window config
  statsWindow?: StatsWindowSize;
}

export const DefaultClientConfig = {
  ...DefaultConfigBase,
  tagName: "gql",
  clientOnlyDirectives: ["connection", "type"],
  clientSchemaDirectives: ["client", "rest"],
  addTypename: true,
  statsWindow: DefaultEngineStatsWindow
};

export interface ServiceConfigFormat extends ConfigBase {
  name?: string;
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
  client?: ClientConfigFormat;
  service?: ServiceConfigFormat;
  engine?: EngineConfig;
}

export type ApolloConfigFormat =
  | WithRequired<ConfigBaseFormat, "client">
  | WithRequired<ConfigBaseFormat, "service">;

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
  name?: string;
  type?: "service" | "client";
}

export type ConfigResult<Config> = {
  config: Config;
  filepath: string;
  isEmpty?: boolean;
} | null;

// XXX change => to named functions
// take a config with multiple project types and return
// an array of individual types
export const projectsFromConfig = (
  config: ApolloConfigFormat
): Array<ClientConfig | ServiceConfig> => {
  const configs = [];
  const { client, service, ...rest } = config;
  // XXX use casting detection
  if (client) configs.push(new ClientConfig(config));
  if (service) configs.push(new ServiceConfig(config));
  return configs;
};

export const parseServiceSpecificer = (
  specifier: ServiceSpecifier
): ServiceIDAndTag => {
  const [id, tag] = specifier.split("@").map(x => x.trim());
  // typescript hinting
  return [id, tag];
};

export const getServiceName = (
  config: ApolloConfigFormat
): string | undefined => {
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
};

export class ApolloConfig {
  public isClient: boolean;
  public isService: boolean;
  public engine: EngineConfig;
  public name?: string;
  public service?: ServiceConfigFormat;
  public client?: ClientConfigFormat;
  private _tag?: string;

  constructor(public rawConfig: ApolloConfigFormat) {
    this.isService = !!rawConfig.service;
    this.isClient = !!rawConfig.client;
    this.engine = rawConfig.engine!;
    this.name = getServiceName(rawConfig);
    this.client = rawConfig.client;
    this.service = rawConfig.service;
  }

  get projects() {
    return projectsFromConfig(this.rawConfig);
  }

  set tag(tag: string) {
    this._tag = tag;
  }

  get tag(): string {
    if (this._tag) return this._tag;
    let tag: string = "current";
    if (this.client && typeof this.client.service === "string") {
      const specifierTag = parseServiceSpecificer(this.client
        .service as ServiceSpecifier)[1];
      if (specifierTag) tag = specifierTag;
    }
    return tag;
  }

  // this type needs to be an "EveryKeyIsOptionalApolloConfig"
  public setDefaults({ client, engine, service }: any): void {
    const config = merge(this.rawConfig, { client, engine, service });
    this.rawConfig = config;
    this.client = config.client;
    this.service = config.service;
    if (engine) this.engine = config.engine;
  }
}

export class ClientConfig extends ApolloConfig {
  public client!: ClientConfigFormat;
}

export class ServiceConfig extends ApolloConfig {
  public service!: ServiceConfigFormat;
}

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

// XXX load .env files automatically
export const loadConfig = async ({
  configPath,
  name,
  type
}: LoadConfigSettings): Promise<ConfigResult<ApolloConfig>> => {
  const explorer = cosmiconfig(MODULE_NAME, {
    searchPlaces: getSearchPlaces(configPath),
    loaders
  });

  let loadedConfig = (await explorer.search(configPath)) as ConfigResult<
    ApolloConfigFormat
  >;

  if (!loadedConfig) {
    loadedConfig = {
      isEmpty: false,
      filepath: configPath || process.cwd(),
      config:
        type === "client"
          ? {
              client: { service: name!, ...DefaultConfigBase }
            }
          : { service: { name: name!, ...DefaultConfigBase } }
    };
  }

  let { config, filepath, isEmpty } = loadedConfig;

  // add API to the env
  const dotEnvPath = resolve(parse(filepath).dir, ".env");
  if (existsSync(dotEnvPath)) {
    const env: { [key: string]: string } = require("dotenv").parse(
      readFileSync(dotEnvPath)
    );

    if (env["ENGINE_API_KEY"]) {
      config = merge({ engine: { apiKey: env["ENGINE_API_KEY"] } }, config);
    }
  }

  if (isEmpty) {
    throw new Error(
      `Apollo config found at ${filepath} is empty. Please add either a client or service config`
    );
  }

  // selectivly apply defaults when loading the config
  if (config.client) config = merge({ client: DefaultClientConfig }, config);
  if (config.service) config = merge({ service: DefaultServiceConfig }, config);
  config = merge({ engine: DefaultEngineConfig }, config);

  return { config: new ApolloConfig(config), filepath, isEmpty };
};
