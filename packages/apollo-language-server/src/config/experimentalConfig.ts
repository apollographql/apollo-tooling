import { dirname } from "path";
import merge from "lodash.merge";
import { ServiceID, ServiceSpecifier, ClientID } from "../engine";
import URI from "vscode-uri";
import { WithRequired } from "apollo-env";
import { getServiceName, parseServiceSpecifier } from "./utils";
import { ValidationRule } from "graphql/validation/ValidationContext";

type ClientOptions = {
  name?: string;
  referenceID?: string;
  version?: string;
  // client schemas
  clientOnlyDirectives?: string[];
  clientSchemaDirectives?: string[];
  addTypename?: boolean;
  // stats window config
  statsWindow?: { to: number; from: number };
};

type SchemaSource = {
  registry?: boolean;
  files?: string[];
  url?: string;
  headers?: Record<string, string>;
  skipSSLValidation?: boolean;
};

type BaseProjectConfig = {
  __experimentalConfig: boolean;
  includes?: string[];
  excludes?: string[];
  apolloGraphId?: string;
  apolloGraphVariant?: string;
  schema?: SchemaSource;
};

type ClientConfig = BaseProjectConfig & {
  type: "client";
  clientOptions?: ClientOptions;
};

type ServiceConfig = BaseProjectConfig & {
  type: "service";
};

type ProjectConfig = ClientConfig | ServiceConfig;

export type ExperimentalApolloConfigFormat = ProjectConfig;
// | {
//     __experimentalConfig: boolean;
//     projects: Record<string, ProjectConfig>;
//   };

export class ExperimentalApolloConfig {
  public rawConfig: ExperimentalApolloConfigFormat;
  public configURI?: URI;

  public isClient: boolean = false;
  public isService: boolean = false;
  // public engine: EngineConfig;
  // public name?: string;
  // public service?: ServiceConfigFormat;
  // public client?: ClientConfigFormat;
  private _variant?: string;

  constructor(
    rawConfig: ExperimentalApolloConfigFormat,
    configURI?: URI,
    overrides?: any
  ) {
    this.rawConfig = merge(rawConfig, overrides);
    this.configURI = configURI;
    this.buildConfigFromRawConfig();
  }

  buildConfigFromRawConfig() {
    const rawConfig = this.rawConfig;

    this.isService = rawConfig.type === "service";
    this.isClient = rawConfig.type === "client";
    if (!(this.isClient || this.isService))
      throw new Error("Apollo config is missing a project type");
  }

  // XXX Is this needed? I don't think anything uses the setDefaults fn in the normal config
  // public overrideConfig(overrides: any) {
  //   console.log(overrides);
  // }

  get configDirURI() {
    return this.configURI && this.configURI.fsPath.includes(".js")
      ? URI.parse(dirname(this.configURI.fsPath))
      : this.configURI;
  }

  // get projects() {
  //   const configs = [];
  //   const { client, service } = this.rawConfig;
  //   if (client)
  //     configs.push(
  //       new ExperimentalClientConfig(this.rawConfig, this.configURI)
  //     );
  //   if (service)
  //     configs.push(
  //       new ExperimentalServiceConfig(this.rawConfig, this.configURI)
  //     );
  //   return configs;
  // }

  set variant(variant: string) {
    this.variant = variant;
  }

  // get variant(): string {
  //   if (this._variant) return this._variant;
  //   let variant: string = "current";
  //   if (this.client && typeof this.client.service === "string") {
  //     const specifierTag = parseServiceSpecifier(this.client
  //       .service as ServiceSpecifier)[1];
  //     if (specifierTag) tag = specifierTag;
  //   }
  //   return tag;
  // }
}

export class ExperimentalClientConfig extends ExperimentalApolloConfig {
  // public client!: ClientConfigFormat;
}

export class ExperimentalServiceConfig extends ExperimentalApolloConfig {
  // public service!: ServiceConfigFormat;
}
