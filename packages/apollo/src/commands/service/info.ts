import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import gql from "graphql-tag";

import { ProjectCommand } from "../../Command";

export default class ServiceDownload extends ProjectCommand {
  static description = "Download the info of your service from Engine";
  static hidden = true;
  static flags = {
    ...ProjectCommand.flags,
    tag: flags.string({
      char: "t",
      description: "The published tag of the schema",
      default: "current"
    })
  };

  async run() {
    const { results }: any = await this.runTasks(({ args, project, flags }) => [
      {
        title: `Getting information about service`,
        task: async ctx => {
          if (!project.config.name) {
            throw new Error("A service name is required but wasn't found");
          }

          const { data, errors } = await project.engine.schemaTagInfo({
            tag: flags.tag,
            service: project.config.name
          });

          if (errors) {
            throw new Error(errors.map(error => error.message).join("\n"));
          }

          if (!(data && data.service)) {
            throw new Error(`Error loading service information`);
          }

          ctx.results = data.service.schema;
        }
      }
    ]);
    const { hash, introspection, createdAt } = results;
    const { fieldCount, typeCount } = introspection;
    this.log("\n");
    table([{ hash, types: typeCount, fields: fieldCount, createdAt }], {
      columns: [
        {
          key: "hash",
          label: "id",
          format: (hash: string) => hash.slice(0, 6)
        },
        { key: "types" },
        { key: "fields" },
        { key: "createdAt", label: "created date" }
      ]
    });
    this.log("\n");
  }
}
