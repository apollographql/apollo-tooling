// provides flatMap
import "apollo-codegen-core/lib/polyfills";

import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import { writeFileSync } from "fs";

import {
  getCommonTasks,
  getCommonManifestTasks
} from "../../helpers/commands/queries/commonTasks";

import { engineFlags } from "../../engine-cli";

import { loadConfigStep } from "../../load-config";

export default class ExtractQueries extends Command {
  static description = "Extracts queries";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help"
    }),
    config: flags.string({
      description: "Path to your Apollo config file"
    }),
    queries: flags.string({
      description:
        "Path to your GraphQL queries, can include search tokens like **"
    }),
    addTypename: flags.boolean({
      description: "Automatically add __typename to your queries",
      allowNo: true
    }),
    removeClientDirectives: flags.boolean({
      allowNo: true,
      description:
        "Automatically remove @client and @connection directives and fields from operations"
    }),
    ...engineFlags,

    tagName: flags.string({
      description:
        "Name of the template literal tag used to identify template literals containing GraphQL queries in Javascript/Typescript code",
      default: "gql"
    })
  };

  static args = [
    {
      name: "output",
      description: "Path to write the extracted queries to",
      required: true,
      default: "manifest.json"
    }
  ];

  async run() {
    let { flags, args } = this.parse(ExtractQueries);

    // oclif doesn't let setting boolean flags to be default
    const defaultFlags = { addTypename: true, removeClientDirectives: true };
    flags = { ...defaultFlags, ...flags };

    const tasks: Listr = new Listr([
      loadConfigStep(flags, false),
      ...getCommonTasks({ flags, errorLogger: this.error.bind(this) }),
      ...getCommonManifestTasks({ flags }),
      {
        title: "Outputing extracted queries",
        task: (ctx, task) => {
          const filename = args.output;
          task.title = "Outputing extracted queries to " + filename;
          writeFileSync(filename, JSON.stringify(ctx.manifest, null, 2));
        }
      }
    ]);

    return tasks.run();
  }
}
