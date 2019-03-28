import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import { introspectionFromSchema } from "graphql";

import { gitInfo } from "../../git";
import { ProjectCommand } from "../../Command";
import { GraphQLServiceProject } from "apollo-language-server";

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
        "Indicates that the schema is a partial schema from a federated service"
    })
  };

  async run() {
    let result;
    let gitContext;
    await this.runTasks(({ flags, project, config }) => [
      {
        title: "Uploading service to Engine",
        task: async () => {
          // handle partial schema uploading
          if (flags.federated) {
            const info = await (project as GraphQLServiceProject).resolveFederationInfo();
            this.log(JSON.stringify(info));
            return;
          }

          if (!config.name) {
            throw new Error("No service found to link to Engine");
          }

          const schema = await project.resolveSchema({ tag: flags.tag });
          gitContext = await gitInfo(this.log);

          const { tag, code } = await project.engine.uploadSchema({
            id: config.name,
            // @ts-ignore
            // XXX Looks like TS should be generating ReadonlyArrays instead
            schema: introspectionFromSchema(schema).__schema,
            tag: flags.tag,
            gitContext
          });

          result = {
            service: config.name,
            hash: tag.schema.hash,
            tag: tag.tag,
            code
          };
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
