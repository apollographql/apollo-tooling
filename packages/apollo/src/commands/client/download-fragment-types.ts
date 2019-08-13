import {
  introspectionFromSchema,
  IntrospectionInterfaceType,
  IntrospectionUnionType
} from "graphql";
import { writeFileSync } from "fs";

import { ClientCommand } from "../../Command";

export default class FragmentTypesDownload extends ClientCommand {
  static description =
    "Download a fragment types from engine or a GraphQL endpoint.";

  static flags = {
    ...ClientCommand.flags
  };

  static args = [
    {
      name: "output",
      description: "Path to write the fragment types result to",
      required: true,
      default: "fragment-types.json"
    }
  ];

  async run() {
    await this.runTasks(({ args, project, flags }) => [
      {
        title: `Saving fragment types to ${args.output}`,
        task: async () => {
          const schema = await project.resolveSchema({ tag: flags.tag });
          const query = introspectionFromSchema(schema);
          const types = query.__schema.types
            .filter(isPossibleTypes)
            .map(type => ({
              kind: type.kind,
              name: type.name,
              possibleTypes: type.possibleTypes.map(({ name }) => ({ name }))
            }));
          writeFileSync(
            args.output,
            JSON.stringify({ __schema: { types } }, null, 2)
          );
        }
      }
    ]);
  }
}

const isPossibleTypes = (
  type: any
): type is IntrospectionInterfaceType | IntrospectionUnionType =>
  type.possibleTypes !== null;
