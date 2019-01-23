import Command from "@oclif/command";
import { existsSync } from "fs";

const inquirer = require("inquirer");

export default class ApolloInit extends Command {
  static description = "Initialize an Apollo project";
  static flags = {};

  async run() {
    if (existsSync("apollo.config.js")) {
      const { shouldOverwriteConfig } = await inquirer.prompt([
        {
          message: `Apollo found an existing config in the current working directory:\n\n\t${process.cwd()}\n\n⚠️ This will overwrite your config.\nWould you like to continue?`,
          name: "shouldOverwriteConfig",
          type: "confirm"
        }
      ]);

      if (!shouldOverwriteConfig) {
        this.exit(0);
      }

      const { projectType } = await inquirer.prompt([
        {
          type: "list",
          name: "projectType",
          message: "What type of project is this?",
          choices: [
            { name: "Client", value: "client" },
            { name: "Service", value: "service" }
          ]
        }
      ]);

      const { clientServiceType } = await inquirer.prompt([
        {
          when: () => projectType === "client",
          type: "list",
          name: "clientServiceType",
          message:
            "How would you like to reference your service? For more details, see:\n\thttps://www.apollographql.com/docs/references/apollo-config.html#client-service",
          choices: [
            { name: "Engine", value: "engine" },
            { name: "Remote Endpoint", value: "endpoint" },
            { name: "Local Schema", value: "localSchema" }
          ]
        }
      ]);

      const { engineKey } = await inquirer.prompt([
        {
          when: () => clientServiceType === "engine",
          type: "input",
          name: "engineKey",
          message:
            "Please paste your Engine API Key. API Keys can be found and created on the service's settings page."
        }
      ]);

      const { clientServiceName } = await inquirer.prompt([
        {
          when: () =>
            clientServiceType === "endpoint" ||
            clientServiceType === "localSchema",
          type: "name",
          name: "clientServiceName",
          message: "(Optional) Name for your service?"
        }
      ]);

      const { localSchemaFile } = await inquirer.prompt([
        {
          when: () => clientServiceType === "localSchema",
          type: "input",
          name: "localSchemaFile",
          message: "Path to your local schema?"
        }
      ]);

      const { remoteUrl, endpointHasHeaders } = await inquirer.prompt([
        {
          when: () => clientServiceType === "endpoint",
          type: "input",
          name: "remoteUrl",
          message: "URL of your remote endpoint?"
        },
        {
          when: () => clientServiceType === "endpoint",
          type: "confirm",
          name: "endpointHasHeaders",
          message: "Does your endpoint require any headers?"
        }
      ]);

      const headers = await this.getHeaders();

      const { includes } = await inquirer.prompt([
        {
          when: () => projectType === "client",
          type: "input",
          name: "includes",
          message: "Glob path for query files? (i.e. src/**/*.{ts|js})"
        }
      ]);

      console.log({
        projectType,
        clientServiceType,
        engineKey,
        clientServiceName,
        localSchemaFile,
        remoteUrl,
        endpointHasHeaders,
        headers,
        includes
      });
    }
  }

  async getHeaders(headers: { key: string; value: string }[] = []) {
    const { key, value, more } = await inquirer.prompt([
      { type: "input", name: "key", message: "Header Key?" },
      { type: "input", name: "value", message: "Header Value?" },
      { type: "confirm", name: "more", message: "Add another header?" }
    ]);

    const allHeaders = [...headers, { key, value }];
    if (more) {
      return this.getHeaders(allHeaders);
    } else {
      return allHeaders;
    }
  }
}
