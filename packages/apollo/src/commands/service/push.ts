import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema, printSchema } from "graphql";
import { gitInfo } from "../../git";
import { ProjectCommand } from "../../Command";
import { UploadSchemaVariables } from "apollo-language-server/lib/graphqlTypes";

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
    })
  };

  async run() {
    let result;
    let gitContext;
    await this.runTasks(({ flags, project, config }) => [
      {
        title: "Uploading service to Engine",
        task: async () => {
          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }

          const schema = await project.resolveSchema({ tag: flags.tag });
          gitContext = await gitInfo(this.log);

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
          }
        }
      }
    ]);

    this.log("\n");
    if (result.code === "NO_CHANGES") {
      this.log("No change in schema from previous version\n");
    }
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
