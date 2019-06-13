import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema, printSchema } from "graphql";
import { gitInfo } from "../../git";
import { ProjectCommand } from "../../Command";
import { UploadSchemaVariables } from "apollo-language-server/lib/graphqlTypes";
import { GraphQLServiceProject } from "apollo-language-server";
import chalk from "chalk";

export default class ServicePush extends ProjectCommand {
  static aliases = ["schema:publish"];
  static description = "Push a service to Engine";
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The tag to publish this service to",
      default: "current"
    }),
    localSchemaFile: flags.string({
      description:
        "Path to your local GraphQL schema file (introspection result or SDL)"
    }),
    federated: flags.boolean({
      char: "f",
      default: false,
      description:
        "Indicates that the schema is a partial schema from a federated service",
      dependsOn: ["serviceName", "serviceURL", "endpoint"]
    }),
    serviceName: flags.string({
      description:
        "Provides the name of the implementing service for a federated graph",
      dependsOn: ["federated"]
    }),
    serviceURL: flags.string({
      description:
        "Provides the url to the location of the implementing service for a federated graph",
      dependsOn: ["federated"]
    }),
    serviceRevision: flags.string({
      description:
        "Provides a unique revision identifier for a change to an implementing service on a federated service push. The default of this is a git sha",
      dependsOn: ["federated"]
    })
  };

  async run() {
    let result;
    let isFederated;
    let gitContext;
    await this.runTasks(({ flags, project, config }) => [
      {
        title: "Uploading service to Engine",
        task: async () => {
          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }

          isFederated = flags.federated;

          gitContext = await gitInfo(this.log);

          // handle partial schema uploading
          if (flags.federated) {
            this.log("Fetching info from federated service");
            const info = await (project as GraphQLServiceProject).resolveFederationInfo();

            if (!info.sdl)
              throw new Error("No SDL found for federated service");

            if (!flags.serviceURL && !info.url)
              throw new Error("No URL found for federated service");

            /**
             * id: service id for root mutation (graph id)
             * variant: like a tag. prod/staging/etc
             * name: implementing service name inside of the graph
             * revision: git commit hash/docker id. placeholder for now
             */

            const {
              compositionConfig,
              errors,
              didUpdateGateway,
              serviceWasCreated
            } = await project.engine.uploadAndComposePartialSchema({
              id: config.name,
              graphVariant: config.tag,
              name: flags.serviceName || info.name,
              url: flags.serviceURL || info.url,
              revision:
                flags.serviceRevision ||
                (gitContext && gitContext.commit) ||
                "",
              activePartialSchema: {
                sdl: info.sdl
              }
            });

            result = {
              service: flags.serviceName || info.name,
              hash: compositionConfig && compositionConfig.schemaHash,
              tag: config.tag,
              errors,
              serviceWasCreated,
              didUpdateGateway,
              graphName: config.name
            };

            return;
          }

          const schema = await project.resolveSchema({ tag: flags.tag });

          const variables: UploadSchemaVariables = {
            id: config.name,
            // @ts-ignore
            // XXX Looks like TS should be generating ReadonlyArrays instead
            schema: introspectionFromSchema(schema).__schema,
            tag: flags.tag,
            gitContext
          };

          const { schema: _, ...restVariables } = variables;
          this.debug("Variables sent to Engine:");
          this.debug(restVariables);
          this.debug("SDL of introspection sent to Engine:");
          this.debug(printSchema(schema));

          const response = await project.engine.uploadSchema(variables);
          if (response) {
            result = {
              service: config.name,
              hash: response.tag ? response.tag.schema.hash : null,
              tag: response.tag ? response.tag.tag : null,
              code: response.code
            };
            this.debug("Result received from Engine:");
            this.debug(result);
          }
        }
      }
    ]);

    this.log("\n");
    if (result.code === "NO_CHANGES") {
      this.log("No change in schema from previous version\n");
    }

    const { errors } = result;
    if (errors && errors.length) {
      let printed = "";

      const messages = [
        ...errors.map(({ message }) => ({
          type: chalk.red("Error"),
          description: message
        }))
      ].filter(x => x !== null);

      table(messages, {
        columns: [
          { key: "type", label: "Change" },
          { key: "description", label: "Description" }
        ],
        // Override `printHeader` so we don't print a header
        printHeader: () => {},
        // The default `printLine` will output to the console; we want to capture the output so we can test
        // it.
        printLine: line => {
          printed += `\n${line}`;
        }
      });

      this.log(printed);
      this.log("\n");
    }

    if (result.didUpdateGateway) {
      this.log(
        `The gateway for the ${
          result.graphName
        } graph was updated with a new schema\n`
      );
    }

    if (result.serviceWasCreated) {
      this.log(
        `A new service called ${result.service} for the graph ${
          result.graphName
        } was created\n`
      );
    }

    if (!isFederated) {
      table([result], {
        columns: [
          {
            key: "hash",
            label: "id",
            format: (hash: string) => hash.slice(0, 6)
          },
          { key: "service", label: "schema" },
          { key: "tag" }
        ]
      });
      this.log("\n");
    }
  }
}
