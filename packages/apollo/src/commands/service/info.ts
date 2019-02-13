import { flags } from "@oclif/command";
import { table } from "heroku-cli-util";
import gql from "graphql-tag";

import { ProjectCommand } from "../../Command";

const INFO_QUERY = gql`
  query GetSchemaTagInfo($service: ID!, $tag: String = "current") {
    service(id: $service) {
      schema(tag: $tag) {
        hash
        gitContext {
          committer
          commit
        }
        introspection {
          fieldCount
          typeCount
        }
        createdAt
      }
    }
  }
`;

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
          const { data, errors } = await project.engine.execute({
            query: INFO_QUERY,
            variables: { tag: flags.tag, service: project.config.name }
          });
          if (errors || !data) {
            this.error(`Error loading service information`);
            return;
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
