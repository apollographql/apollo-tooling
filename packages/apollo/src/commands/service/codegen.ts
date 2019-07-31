import Command, { flags } from "@oclif/command";
import { translate, Language } from "apollo-server-codegen";
import { readFile, writeFile, watch } from "fs";
import { join, extname } from "path";
import chalk from "chalk";
import prettier from "prettier";
import { parse } from "recast/parsers/typescript";
import { visit, types } from "recast";
import lineColumn from "line-column";

const { Identifier } = types.namedTypes;

const namesMapping: Record<
  string,
  { humanReadable: string; extension: string; language: Language }
> = {
  typescript: {
    humanReadable: "TypeScript",
    extension: "ts",
    language: "typescript"
  },
  ts: {
    humanReadable: "TypeScript",
    extension: "ts",
    language: "typescript"
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
    }),
    experimentalInternalEnumValues: flags.boolean({
      description:
        "Use this flag if you use [internal enum values](https://www.apollographql.com/docs/apollo-server/features/scalars-enums/#internal-values) to silence warnings about incompatible enum types"
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
    const target = names.language;

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
      await this.executeCodegen(inputPath, target, output, flags);
    } catch (e) {
      if (flags.watch) {
        console.warn(chalk.yellow(e));
      } else {
        console.error(chalk.red(e));
        process.exit(1);
      }
    }

    if (flags.watch) {
      this.log(`Watching for changes...`);
      watch(inputPath, async () => {
        this.log(`Change detected. Regenerating typings.`);
        try {
          await this.executeCodegen(inputPath, target, output, flags);
        } catch (e) {
          console.warn(chalk.yellow(e));
        }
        this.log(`Watching for changes...`);
      });
    }
  }

  private async executeCodegen(
    path: string,
    target: Language,
    output: string,
    flags: any
  ) {
    const inputText = await new Promise<string>((resolve, reject) =>
      readFile(path, (err, data) => {
        if (err) return reject(err.message);
        resolve(data.toString());
      })
    );
    const inputFileType = extname(path);
    const getSDL = () => {
      const type = fileTypesMapping[inputFileType];
      switch (type) {
        case "javascript":
          const sdl = getGQLTagsFromSource(inputText);
          if (!sdl.sdl)
            throw new Error(
              "Could not extract SDL from input file. Are you using `graphql-tag` as `gql`?"
            );
          return sdl;
        case "graphql":
          return { sdl: inputText, loc: 0 };
        default:
          throw new Error(
            `Unknown input file type ${inputFileType}, supported file types are: .js(x), .ts(x), .gql, or .graphql`
          );
      }
    };

    const { sdl, loc } = getSDL();

    try {
      const translated = translate(sdl, target, {
        __experimentalInternalEnumValueSupport:
          flags.experimentalInternalEnumValues
      });

      const prettierOptions = await prettier.resolveConfig(output);
      const formatted = prettier.format(translated, {
        parser: "typescript",
        ...prettierOptions
      });

      await new Promise(resolve => writeFile(output, formatted, resolve));
    } catch (e) {
      let message: string = e.message;

      if (message && message.includes("Syntax Error")) {
        // error in gql parse. Are they maybe passing an introspection result?
        message +=
          ".\nIs the input in SDL format?\nSee https://bit.ly/2SzrSMk for help with schema formats";
      } else if (message && message.match(/\(\d+,\d+\).*/)) {
        message = message
          .split("\n")
          .map(message => {
            const finder = lineColumn(inputText);

            const [_, start, end, text] = message.match(/\((\d+),(\d+)\)(.*)/)!;
            const adjustedStart = finder.fromIndex(+loc + +start);
            const adjustedEnd = finder.fromIndex(+loc + +end);
            return `${path}:(${adjustedStart.line},${adjustedStart.col},${adjustedEnd.line},${adjustedEnd.col}) ${text}`;
          })
          .join("\n");
      }
      throw message;
    }
  }
}

const getGQLTagsFromSource = (source: string) => {
  const finder = lineColumn(source);
  let sdl = "";
  let loc;

  visit(parse(source), {
    visitTaggedTemplateExpression(path) {
      this.traverse(path);
      const expr = path.node;
      if (Identifier.check(expr.tag) && expr.tag.name === "gql") {
        loc = finder.toIndex(expr.loc!.start.line, expr.loc!.start.column) + 5; // 5 = offset from the gql tag to SDL
        expr.quasi.quasis.forEach(v => (sdl += v.value.raw));
      }
    }
  });

  // @ts-ignore Says `loc` is used before defined, but it isn't.
  return { sdl, loc };
  // return sdl;
};
