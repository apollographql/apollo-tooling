import 'apollo-codegen-core/lib/polyfills';
import { Command, flags } from "@oclif/command";
import * as Listr from "listr";
import * as path from "path";

import { TargetType, default as generate } from 'apollo-codegen/lib/generate';

import * as globby from "globby";

export default class Generate extends Command {
  static description = "Generate static types for GraphQL queries.";

  static flags = {
    help: flags.help({
      char: "h",
      description: "Show command help",
    }),
    queries: flags.string({
      description: "Path to your GraphQL queries, can include search tokens like **",
      default: "**/*.graphql",
    }),
    schema: flags.string({
      description: "Path to your GraphQL schema introspection result",
      default: "schema.json",
    }),
    target: flags.string({
      description: "Type of code generator to use (swift | typescript | flow | scala), inferred from output"
    })
  };

  static args = [
    {
      name: "output",
      description: "Path to write the generated code to",
      required: true
    }
  ]

  async run() {
    const { flags, args } = this.parse(Generate);

    if (!args.output) {
      this.error("The output path must be specified in the arguments");
      return;
    }

    let inferredTarget: TargetType;
    if (flags.target) {
      if (["swift", "typescript", "flow", "scala"].includes(flags.target)) {
        inferredTarget = flags.target as TargetType;
      } else {
        this.error(`Unsupported target: ${flags.target}`);
      }
    } else {
      switch(args.output.split('.').reverse()[0]) {
        case "swift":
          inferredTarget = "swift";
          break;

        case "ts" || "tsx":
          inferredTarget = "typescript";
          break;

        case "js":
          inferredTarget = "flow";
          break;

        case "scala":
          inferredTarget = "scala";
          break;

        default:
          this.error("Could not infer target from output file type, please use --target");
          return;
      }

      this.log(`\nInferred target for code generation: ${inferredTarget}\n`);
    }

    const tasks = new Listr([
      {
        title: "Scanning for GraphQL queries",
        task: async ctx => {
          const paths = await globby(flags.queries ? [ flags.queries ] : []);
          ctx.queryPaths = paths;
        }
      },
      {
        title: "Generating query files",
        task: async ctx => {
          generate(ctx.queryPaths, path.resolve(flags.schema as string), args.output as string, "", inferredTarget, "", "", {})
        },
      },
    ]);

    return tasks.run().then(async ({ }) => {
      this.exit(0);
    });
  }
}
