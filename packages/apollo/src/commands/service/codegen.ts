import Command, { flags } from "@oclif/command";
import { ProjectCommand } from "../../Command";
import { translate, Language } from "apollo-server-codegen";
import { readFile, writeFile, watch } from "fs";
import { join, extname } from "path";
import chalk from "chalk";

const namesMapping: Record<
  Language,
  { humanReadable: string; extension: string }
> = {
  typescript: {
    humanReadable: "TypeScript",
    extension: "ts"
  },
  ts: {
    humanReadable: "TypeScript",
    extension: "ts"
  }
};

const fileTypesMapping = {
  ".ts": "javascript",
  ".tsx": "javascript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".gql": "graphql",
  ".graphql": "graphql"
};

export default class ServiceCodegen extends Command {
  static description =
    "Generate resolver typings from a local schema file. This can be either a schema embedded in `gql` tags in a JavaScript or TypeScript file, or a `.graphql` file containing the service's SDL.";
  static flags = {
    watch: flags.boolean({
      char: "w",
      description: "Watch the specified file for changes"
    }),
    target: flags.string({
      char: "t",
      description:
        "Language to build typings for (currently only typescript is supported)",
      default: "typescript"
    }),
    output: flags.string({
      char: "o",
      description: "Name of the file to write generated typings to",
      default: "resolver-types"
    })
  };

  static examples = [
    "apollo service:codegen schema.ts -o schema.d.ts",
    "apollo service:codegen schema.gql -o schema.d.ts"
  ];

  static args = [{ name: "input", required: true }];

  async run() {
    const { flags, args } = this.parse(ServiceCodegen);

    const names = namesMapping[flags.target!];
    if (!names) {
      throw new Error(
        `Unsupported target "${
          flags.target
        }. Supported values are: "${Object.keys(namesMapping).join(", ")}"`
      );
    }
    const target = flags.target as Language;

    const input: string = args.input;

    const output =
      (flags.output as string).indexOf(".") > -1
        ? flags.output!
        : `${flags.output}.${names.extension}`;

    this.log(
      `Generating ${names.humanReadable} typings: ${input} -> ${output}`
    );

    const inputPath = join(process.cwd(), input);

    try {
      await this.executeCodegen(inputPath, target, output);
    } catch (e) {
      this.error(chalk.red(e.message));
    }

    if (flags.watch) {
      this.log(`Watching for changes...`);
      watch(inputPath, async () => {
        this.log(`Change detected. Regenerating typings.`);
        try {
          await this.executeCodegen(inputPath, target, output);
        } catch (e) {
          this.warn(chalk.yellow("Unable to run codegen: " + e.message));
        }
      });
    }
  }

  private async executeCodegen(path: string, target: Language, output: string) {
    const inputText = await new Promise<string>(resolve =>
      readFile(path, (err, data) => {
        if (err) throw Error(err.message);
        resolve(data.toString());
      })
    );
    const inputFileType = extname(path);
    const getSDL = () => {
      const type = fileTypesMapping[inputFileType];
      switch (type) {
        case "javascript":
          const getInnerSDL = /(?:(?:gql|graphql)`)((?:[^`\\]|\\`|\\n|\\r|\\\\)*)`/;
          const sdl = inputText.match(getInnerSDL);
          if (!sdl)
            throw new Error(
              "Could not extract SDL from input file. Are you using `graphql-tag` as `gql`?"
            );
          return sdl[1];
        case "graphql":
          return inputText;
        default:
          throw new Error(
            `Unknown input file type ${inputFileType}, supported file types are: .js(x), .ts(x), .gql, or .graphql`
          );
      }
    };
    const sdl = getSDL();
    try {
      const translated = translate(sdl, target);
      await new Promise(resolve => writeFile(output, translated, resolve));
    } catch (e) {
      if (e.message && e.message.includes("Syntax Error")) {
        // error in gql parse. Are they maybe passing an introspection result?
        e.message +=
          ".\nIs this file in SDL format?\nSee https://bit.ly/2SzrSMk for help with schema formats";
      }
      throw e;
    }
  }
}
