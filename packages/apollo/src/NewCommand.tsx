import Command, { flags } from "@oclif/command";
import React, { Component, useEffect, useState } from "react";
import { render as renderInk, Color, Box, Text, Static } from "ink";
import { WithRequired, DeepPartial } from "apollo-env";
import {
  GraphQLProject,
  GraphQLServiceProject,
  GraphQLClientProject,
  loadConfig,
  isClientConfig,
  isServiceConfig,
  ApolloConfig,
  getServiceFromKey,
  Debug
} from "apollo-language-server";
import URI from "vscode-uri";
import { parse, resolve } from "path";

import { OclifLoadingHandler } from "./OclifLoadingHandler";
const { version, referenceID } = require("../package.json");

export interface ProjectContext<Flags = any, Args = any> {
  project: GraphQLProject;
  config: ApolloConfig;
  flags: Flags;
  args: Args;
}

export interface Flags {
  config?: string;
  header?: string[];
  endpoint?: string;
  localSchemaFile?: string;
  key?: string;
  engine?: string;
  frontend?: string;
  tag?: string;
  skipSSLValidation?: boolean;
}

const headersArrayToObject = (
  arr?: string[]
): Record<string, string> | undefined => {
  if (!arr) return;
  return arr
    .map(val => JSON.parse(val))
    .reduce((pre, next) => ({ ...pre, ...next }), {});
};

export default class ApolloCommand extends Command {
  static flags = {
    config: flags.string({
      char: "c",
      description: "Path to your Apollo config file"
    }),
    header: flags.string({
      multiple: true,
      parse: header => {
        const separatorIndex = header.indexOf(":");
        const key = header.substring(0, separatorIndex).trim();
        const value = header.substring(separatorIndex + 1).trim();
        return JSON.stringify({ [key]: value });
      },
      description:
        "Additional header to send to server for introspectionQuery. May be used multiple times to add multiple headers. NOTE: The `--endpoint` flag is REQUIRED if using the `--header` flag."
    }),
    endpoint: flags.string({
      description: "The url of your service"
    }),
    key: flags.string({
      description: "The API key for the Apollo Engine service",
      default: () => process.env.ENGINE_API_KEY
    }),
    engine: flags.string({
      description: "Reporting URL for a custom Apollo Engine deployment",
      hidden: true
    }),
    frontend: flags.string({
      description: "URL for a custom Apollo Engine frontend",
      hidden: true
    })
  };

  public project!: GraphQLProject;
  protected type: "service" | "client" = "service";

  protected configMap?: (flags: any) => DeepPartial<ApolloConfig>;
  private ctx!: ProjectContext;

  async init() {
    const { flags, args } = this.parse(this.constructor as any);
    this.ctx = { flags, args } as any;

    // tell the language server to use the built-in loggers
    // from oclif
    Debug.SetLoggers({
      info: this.log,
      warning: this.warn,
      error: console.error
    });

    const config = await this.createConfig(flags);
    if (!config) return;

    this.createService(config, flags);
    this.ctx.config = config;

    // make sure this the first item in the task list
    // XXX Somehow this task gets pushed onto the stack multiple times sometimes
    {
      await this.project.whenReady;
      renderInk(<Text>Loaded Apollo Project!</Text>);
    }
    // this.tasks.push({
    //   title: "Loading Apollo Project",
    //   task: async ctx => {
    //     await this.project.whenReady;
    //     ctx = { ...ctx, ...this.ctx };
    //   }
    // });
  }

  render() {
    return <Text>Must implement the render function</Text>;
  }
  async run() {
    renderInk(this.render());
  }

  protected async createConfig(flags: Flags) {
    const service = flags.key ? getServiceFromKey(flags.key) : undefined;
    const config = await loadConfig({
      configPath: flags.config && parse(resolve(flags.config)).dir,
      configFileName: flags.config,
      name: service,
      type: this.type
    });

    if (!config) {
      this.error("A config failed to load, so the command couldn't be run");
      this.exit(1);
      return;
    }

    config.tag = flags.tag || config.tag || "current";
    //  flag overides
    config.setDefaults({
      engine: {
        apiKey: flags.key,
        endpoint: flags.engine,
        frontend: flags.frontend
      }
    });

    if (flags.endpoint) {
      config.setDefaults({
        service: {
          endpoint: {
            url: flags.endpoint,
            headers: headersArrayToObject(flags.header),
            ...(flags.skipSSLValidation && { skipSSLValidation: true })
          }
        }
      });
    }

    // this can set a single or multiple local schema files
    if (flags.localSchemaFile) {
      const files = flags.localSchemaFile.split(",");
      if (isClientConfig(config)) {
        config.setDefaults({
          client: {
            service: {
              localSchemaFile: files
            }
          }
        });
      } else if (isServiceConfig(config)) {
        config.setDefaults({
          service: {
            localSchemaFile: files
          }
        });
      }
    }

    // load per command type defaults;
    if (this.configMap) {
      const defaults = this.configMap(flags);
      config.setDefaults(defaults);
    }

    return config;
  }

  protected createService(config: ApolloConfig, flags: Flags) {
    const loadingHandler = new OclifLoadingHandler(this);

    // When no config is provided, configURI === process.cwd()
    // In this case, we don't want to look to the .dir since that's the parent
    const configPath = config.configURI!.fsPath;
    const rootURI =
      configPath === process.cwd()
        ? URI.file(configPath)
        : URI.file(parse(configPath).dir);

    const clientIdentity = {
      name: "Apollo CLI",
      version,
      referenceID
    };

    if (isServiceConfig(config)) {
      this.project = new GraphQLServiceProject({
        config,
        loadingHandler,
        rootURI,
        clientIdentity
      });
    } else if (isClientConfig(config)) {
      this.project = new GraphQLClientProject({
        config,
        loadingHandler,
        rootURI,
        clientIdentity
      });
    } else {
      throw new Error(
        "Unable to resolve project type. Please add either a client or service config. For more information, please refer to https://bit.ly/2ByILPj"
      );
    }

    this.ctx.project = this.project;
  }
}

export function useConfig() {
  const [loading, setLoadStatus] = useState(true);
  const [config, setConfig] = useState();

  useEffect(() => {
    if (!loading) return;

    // load config here
    new Promise(resolve => setTimeout(resolve, 1000)).then(data => {
      setConfig({ service: "my-project" });
      setLoadStatus(false);
    });
  });
  return [loading, config];
}

export function useFlags() {}
