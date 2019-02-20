import Command from "@oclif/command";
import { existsSync, writeFileSync, readFileSync } from "fs";
import { resolve } from "path";
import chalk from "chalk";
import * as inquirer from "inquirer";
import * as prettier from "prettier";

type ProjectType = "client" | "service";
interface Header {
  key: string;
  value: string;
}

export default class ApolloInit extends Command {
  static description = "Initialize an Apollo project";
  static flags = {};

  async run() {
    if (existsSync("apollo.config.js")) {
      const { shouldOverwriteConfig } = await inquirer.prompt<{
        shouldOverwriteConfig: boolean;
      }>([
        {
          message: `Apollo found an existing config in the current working directory:\n\n   ${process.cwd()}\n\n⚠️  This will overwrite your config. Would you like to continue?`,
          name: "shouldOverwriteConfig",
          type: "confirm",
          default: false
        }
      ]);

      if (!shouldOverwriteConfig) {
        this.exit(0);
      }

      const { projectType } = await inquirer.prompt<{
        projectType: ProjectType;
      }>([
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

      const config = await (projectType === "client"
        ? this.buildClientConfig()
        : this.buildServiceConfig());

      // Use their prettier config if we find one, else default
      const prettierConfig = await (prettier.resolveConfig(process.cwd()) ||
        {});

      const formatted = prettier.format(
        `module.exports = ${JSON.stringify(config)}`,
        {
          ...prettierConfig,
          parser: "babel"
        }
      );
      writeFileSync("apollo.config.js", formatted);

      this.log(
        `\n\n🚀  ${chalk.bold.green(
          "Successfully created Apollo config!"
        )}\n\nConfig file: ${chalk.blue(`${resolve("apollo.config.js")}`)}\n`
      );
    }
  }

  async buildClientConfig() {
    const { clientServiceType } = await inquirer.prompt<{
      clientServiceType: "engine" | "endpoint" | "localSchema";
    }>([
      {
        type: "list",
        name: "clientServiceType",
        message:
          "How would you like to reference your service?\n\n    For more details, see our configuration docs: https://bit.ly/2Tb3mAu\n",
        choices: [
          { name: "Engine", value: "engine" },
          { name: "Remote Endpoint", value: "endpoint" },
          { name: "Local Schema", value: "localSchema" }
        ]
      }
    ]);

    const { engineKey } = await inquirer.prompt<{ engineKey: string }>([
      {
        when: () => clientServiceType === "engine",
        type: "input",
        name: "engineKey",
        message:
          "Please paste your Engine API Key. API Keys can be found and created on the service's settings page.\n",
        validate: (input: string) => {
          if (!(typeof input === "string")) return false;

          const { prefix, serviceName, keyId } = this.parseApiKey(input);
          return (
            prefix === "service" && serviceName.length > 0 && keyId.length > 0
          );
        }
      }
    ]);

    if (engineKey) {
      // Write ENGINE_API_KEY
      if (existsSync(".env")) {
        const envFile = readFileSync(".env").toString();
        if (envFile.includes("ENGINE_API_KEY")) {
          // Prompt user to overwrite existing key before we invade their .env file
          const { shouldOverwriteKey } = await inquirer.prompt<{
            shouldOverwriteKey: boolean;
          }>([
            {
              type: "confirm",
              name: "shouldOverwriteKey",
              default: false,
              message:
                "An ENGINE_API_KEY already exists in your .env file, would you like to overwrite it with the key you've provided?",
              prefix: "⚠️  "
            }
          ]);

          // Replace current key if user confirms the overrwrite
          if (shouldOverwriteKey) {
            const updatedEnv = envFile.replace(
              /ENGINE_API_KEY=service:.*:.*/m,
              `ENGINE_API_KEY=${engineKey}`
            );

            writeFileSync(".env", updatedEnv);
            this.log("\n    ✅  Replaced ENGINE_API_KEY in .env file\n");
          } else {
            this.log(
              "\n    ❌  Did not write new ENGINE_API_KEY to .env file\n"
            );
          }
        } else {
          // Write key to end of .env file if no key previously existed
          writeFileSync(".env", `${envFile}\nENGINE_API_KEY=${engineKey}`);
          this.log("\n    ✅  Wrote ENGINE_API_KEY to .env file\n");
        }
      } else {
        // Create a new .env file if none is found
        writeFileSync(".env", `ENGINE_API_KEY=${engineKey}`);
        this.log("\n    ✅  Created .env file and added ENGINE_API_KEY\n");

        if (existsSync(".gitignore")) {
          const { shouldUpdateGitIgnore } = await inquirer.prompt<{
            shouldUpdateGitIgnore: boolean;
          }>([
            {
              type: "confirm",
              name: "shouldUpdateGitIgnore",
              message:
                "It's strongly recommended to add your new .env file to .gitignore, would you like to do that now?"
            }
          ]);

          if (shouldUpdateGitIgnore) {
            const gitIgnore = readFileSync(".gitignore").toString();
            writeFileSync(".gitignore", `${gitIgnore}\n\n.env`);
            this.log("\n    ✅  Updated .gitignore\n");
          }
        } else {
          this.log(
            "\n    ⚠️  No .gitignore found, it's strongly recommended that you create one so as not to accidentally commit your .env file to source control.\n"
          );
        }
      }
    }

    const { clientServiceName } = await inquirer.prompt<{
      clientServiceName: string;
    }>([
      {
        when: () =>
          clientServiceType === "endpoint" ||
          clientServiceType === "localSchema",
        type: "name",
        name: "clientServiceName",
        message: "(Optional) Name for your service?"
      }
    ]);

    const { localSchemaFile } = await inquirer.prompt<{
      localSchemaFile: string;
    }>([
      {
        when: () => clientServiceType === "localSchema",
        type: "input",
        name: "localSchemaFile",
        message: "Path to your local schema?"
      }
    ]);

    const { remoteUrl, endpointHasHeaders } = await inquirer.prompt<{
      remoteUrl: string;
      endpointHasHeaders: boolean;
    }>([
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

    const headers = endpointHasHeaders ? await this.getHeaders([]) : null;

    const includes = await this.getGlobs(
      [],
      "Glob pattern for query and client-side schema files? Please provide one at a time.\n    i.e. src/**/*.{ts,tsx,js,jsx,graphql}\n"
    );

    const { hasExcludes } = await inquirer.prompt<{ hasExcludes: boolean }>([
      {
        type: "confirm",
        name: "hasExcludes",
        default: false,
        message:
          "Are there any patterns you'd like to EXCLUDE from the project? Please provide one at a time.\n    By default, we exclude: **/node_modules and **/__tests__"
      }
    ]);

    const excludes = hasExcludes
      ? await this.getGlobs([], "Glob pattern to exclude?")
      : [];

    const { tagName } = await inquirer.prompt<{
      tagName: string;
      hasCustomTagName: boolean;
    }>([
      {
        type: "confirm",
        name: "hasCustomTagName",
        default: false,
        message:
          "Does your project use a custom tagged template literal for operations? i.e. NOT gql"
      },
      {
        when: ({ hasCustomTagName }) => hasCustomTagName,
        type: "input",
        name: "tagName",
        message: "Custom tag?"
      }
    ]);

    const { removeAddTypename } = await inquirer.prompt<{
      removeAddTypename: boolean;
    }>([
      {
        type: "confirm",
        name: "removeAddTypename",
        default: false,
        message:
          'Does your project explicitly remove __typename from your queries?\n    To determine this, look for "addTypename: false" in your ApolloClient config.\n    If you are unsure, the answer is likely no.'
      }
    ]);

    const {
      usesClientOnlyDirectives,
      clientOnlyDirectives
    } = await inquirer.prompt<{
      usesClientOnlyDirectives: boolean;
      clientOnlyDirectives?: string;
    }>([
      {
        type: "confirm",
        name: "usesClientOnlyDirectives",
        default: false,
        message:
          "Does your project use any custom client-only directives?\n    By default, we include 'connection' and 'type'."
      },
      {
        when: ({ usesClientOnlyDirectives }) => usesClientOnlyDirectives,
        type: "input",
        name: "clientOnlyDirectives",
        message:
          "List all custom, client-only directives (seperated by spaces or commas)"
      }
    ]);

    const {
      usesClientSchemaDirectives,
      clientSchemaDirectives
    } = await inquirer.prompt<{
      usesClientSchemaDirectives: boolean;
      clientSchemaDirectives?: string;
    }>([
      {
        type: "confirm",
        name: "usesClientSchemaDirectives",
        default: false,
        message:
          "Does your project use any custom client schema directives?\n    By default, we include 'client' and 'rest'."
      },
      {
        when: ({ usesClientSchemaDirectives }) => usesClientSchemaDirectives,
        type: "input",
        name: "clientSchemaDirectives",
        message:
          "List all custom, client schema directives (seperated by spaces or commas)"
      }
    ]);

    return {
      client: {
        service:
          clientServiceType === "engine"
            ? // Engine config
              this.parseApiKey(engineKey).serviceName
            : // Local schema file config
            clientServiceType === "localSchema"
            ? {
                ...(clientServiceName && { name: clientServiceName }),
                localSchemaFile
              }
            : // Remote config
              {
                ...(clientServiceName && { name: clientServiceName }),
                url: remoteUrl,
                ...(endpointHasHeaders && { headers })
              },
        ...(includes.length > 0 && { includes }),
        ...(excludes.length > 0 && { excludes }),
        ...(tagName && { tagName }),
        ...(removeAddTypename && { addTypename: false }),
        ...(usesClientOnlyDirectives &&
          clientOnlyDirectives && {
            clientOnlyDirectives: this.shapeDirectivesInput(
              clientOnlyDirectives
            )
          }),
        ...(usesClientSchemaDirectives &&
          clientSchemaDirectives && {
            clientSchemaDirectives: this.shapeDirectivesInput(
              clientSchemaDirectives
            )
          })
      }
    };
  }

  async buildServiceConfig() {
    const { serviceType } = await inquirer.prompt<{
      serviceType: "endpoint" | "localSchema";
    }>([
      {
        type: "list",
        name: "serviceType",
        message:
          "How would you like to reference your service?\n\n    For more details, see our configuration docs: https://bit.ly/2RbYSYC\n",
        choices: [
          { name: "Remote Endpoint", value: "endpoint" },
          { name: "Local Schema", value: "localSchema" }
        ]
      }
    ]);

    const { localSchemaFile } = await inquirer.prompt<{
      localSchemaFile: string;
    }>([
      {
        when: () => serviceType === "localSchema",
        type: "input",
        name: "localSchemaFile",
        message: "Path to your local schema?"
      }
    ]);

    const { remoteUrl, endpointHasHeaders } = await inquirer.prompt<{
      remoteUrl: string;
      endpointHasHeaders: boolean;
    }>([
      {
        when: () => serviceType === "endpoint",
        type: "input",
        name: "remoteUrl",
        message: "URL of your remote endpoint?"
      },
      {
        when: () => serviceType === "endpoint",
        type: "confirm",
        name: "endpointHasHeaders",
        message: "Does your endpoint require any headers?"
      }
    ]);

    const headers = endpointHasHeaders ? await this.getHeaders([]) : null;

    return {
      service: {
        ...(serviceType === "localSchema" && { localSchemaFile }),
        ...(serviceType === "endpoint" && {
          url: remoteUrl,
          ...(endpointHasHeaders && headers && { headers })
        })
      }
    };
  }

  async getHeaders(headers: Header[]): Promise<Header[]> {
    const { key, value, more } = await inquirer.prompt<
      Header & { more: boolean }
    >([
      { type: "input", name: "key", message: "Header Key?" },
      { type: "input", name: "value", message: "Header Value?" },
      {
        type: "confirm",
        name: "more",
        default: false,
        message: "Add another header?"
      }
    ]);

    const allHeaders = [...headers, { key, value }];
    if (more) {
      return this.getHeaders(allHeaders);
    } else {
      return allHeaders;
    }
  }

  async getGlobs(globs: string[], message: string): Promise<string[]> {
    const { glob, more } = await inquirer.prompt<{
      glob: string;
      more: boolean;
    }>([
      {
        type: "input",
        name: "glob",
        message
      },
      {
        type: "confirm",
        name: "more",
        message: "Add another pattern?"
      }
    ]);

    const allGlobs = [...globs, glob];
    if (more) {
      return this.getGlobs(allGlobs, message);
    } else {
      return allGlobs;
    }
  }

  parseApiKey(key: string) {
    const [prefix, serviceName, keyId] = key.split(":");
    return { prefix, serviceName, keyId };
  }

  shapeDirectivesInput(input: string) {
    return input
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(directive => directive.replace("@", ""));
  }
}
