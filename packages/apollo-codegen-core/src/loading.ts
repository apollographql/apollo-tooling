import { fs, withGlobalFS } from "./localfs";
import { stripIndents } from "common-tags";
import * as fg from "glob";
import * as path from "path";
const astTypes = require("ast-types");
const recast = require("recast");

import {
  buildClientSchema,
  Source,
  concatAST,
  parse,
  DocumentNode,
  GraphQLSchema
} from "graphql";

import { ToolError } from "./errors";

export function loadSchema(schemaPath: string): GraphQLSchema {
  if (!fs.existsSync(schemaPath)) {
    throw new ToolError(`Cannot find GraphQL schema file: ${schemaPath}`);
  }
  const schemaData = require(schemaPath);

  if (!schemaData.data && !schemaData.__schema) {
    throw new ToolError(
      "GraphQL schema file should contain a valid GraphQL introspection query result"
    );
  }
  return buildClientSchema(schemaData.data ? schemaData.data : schemaData);
}

function maybeCommentedOut(content: string) {
  return (
    (content.indexOf("/*") > -1 && content.indexOf("*/") > -1) ||
    content.split("//").length > 1
  );
}

function filterValidDocuments(documents: string[]) {
  return documents.filter(document => {
    const source = new Source(document);
    try {
      parse(source);
      return true;
    } catch (e) {
      if (!maybeCommentedOut(document)) {
        console.warn(
          stripIndents`
            Failed to parse:

            ${document.trim().split("\n")[0]}...
          `
        );
      }

      return false;
    }
  });
}

export function loadInterpolatedQueries(
  inputPaths: string[],
  tagName: string = "gql"
): string[] {
  return inputPaths
    .flatMap(i =>
      withGlobalFS(() => fg.sync(i, { cwd: process.cwd(), absolute: true }))
    )
    .flatMap(inputPath => {
      if (fs.lstatSync(inputPath).isDirectory()) {
        return;
      }

      const body = fs.readFileSync(inputPath, "utf8");
      if (!body) {
        return;
      }

      if (
        inputPath.endsWith(".jsx") ||
        inputPath.endsWith(".js") ||
        inputPath.endsWith(".tsx") ||
        inputPath.endsWith(".ts")
      ) {
        console.log("loading from " + inputPath);
        return extractAndInterpolateJavascriptDocumets(body.toString(), {
          tagName,
          fileRoot: path.basename(inputPath)
        });
      }

      if (inputPath.endsWith(".graphql") || inputPath.endsWith(".gql")) {
        throw new Error("unimplemented");
      }

      return;
    })
    .filter(source => source) as Array<string>;
}

function extractAndInterpolateJavascriptDocumets(
  content: string,
  options: {
    tagName?: string;
    fileRoot: string;
  }
): string[] {
  let tagName = options.tagName || "gql";

  const ast = recast.parse(content, {
    parser: require("recast/parsers/babylon")
  });

  const mapping = new Map<string, string>();
  const templates: Array<{
    expressions: Array<string>;
    quasis: Array<string>;
  }> = [];
  const finished: string[] = [];
  const variableToValue = new Map<string, string>();

  // isolate the template literals tagged with gql
  astTypes.visit(ast, {
    visitTaggedTemplateExpression: (path: any) => {
      const tag = path.value.tag;
      // XXX configurable
      if (tag.name === tagName) {
        const literal = path.value.quasi;

        // templates without any expressions
        if ((literal.expressions as Array<any>).length === 0) {
          finished.push(literal.quasis[0].value.cooked);
          return false;
        }

        templates.push({
          quasis: literal.quasis.map((o: any) => o.value.cooked),
          expressions: literal.expressions.map((o: any) => o.name)
        });

        literal.expressions.forEach((exp: any) => {
          // look for variables from import expressions
          // XXX need to also include variable declarations -> no dynamic queries
          const node = path.scope.lookup(exp.name).bindings[exp.name];

          const parent = node[0].parent.value;
          const parentType = parent.type;
          switch (parentType) {
            case "VariableDeclarator":
              console.log(parent.init.quasi.quasis[0].value.cooked);
              variableToValue.set(
                exp.name,
                parent.init.quasi.quasis[0].value.cooked
              );
              break;
            default:
              const filePath = node[0].parent.parent.value.source.value;
              mapping.set(exp.name, filePath);
          }
        });
      }
      return false;
    }
  });

  // scrape for the referenced exports
  mapping.forEach((file, exportedValue) => {
    try {
      [".js", ".jsx", ".ts", ".tsx", ".mjs"].forEach(ext => {
        const filename =
          (file.startsWith("/") ? process.cwd() : options.fileRoot || "") +
          file +
          ext;

        let contents;
        if (fs.existsSync(filename)) {
          contents = fs.readFileSync(filename).toString();
        } else {
          return;
        }

        const ast = recast.parse(contents, {
          parser: require("recast/parsers/babylon")
        });
        astTypes.visit(ast, {
          visitProgram: (path: any) => {
            const value = path.scope.getBindings()[exportedValue][0].parent
              .value.init.quasi.quasis[0].value.cooked;

            variableToValue.set(exportedValue, value);
            return false;
          }
        });
      });
      if (!variableToValue.has(exportedValue)) {
        throw new Error(
          "Unable to locate import " + file + " with " + options.fileRoot
        );
      }
    } catch (e) {
      console.log(e);
    }
  });

  const interpolated = templates.map(({ expressions, quasis }) => {
    return quasis.reduce((prev, q, i) => {
      return prev + q + (variableToValue.get(expressions[i]) || "");
    }, "");
  });

  finished.push(...interpolated);

  return finished;
}

export function extractDocumentFromJavascript(
  content: string,
  options: {
    tagName?: string;
  } = {}
): string | null {
  let tagName = options.tagName || "gql";

  const re = new RegExp(tagName + "s*`([^`]*)`", "g");
  let match;
  let matches = [];

  while ((match = re.exec(content))) {
    const doc = match[1].replace(/\${[^}]*}/g, "");

    matches.push(doc);
  }

  matches = filterValidDocuments(matches);
  console.log(matches);
  const doc = matches.join("\n");
  return doc.length ? doc : null;
}

export function loadQueryDocuments(
  inputPaths: string[],
  tagName: string = "gql"
): DocumentNode[] {
  const sources = inputPaths
    .map(inputPath => {
      if (fs.lstatSync(inputPath).isDirectory()) {
        return null;
      }

      const body = fs.readFileSync(inputPath, "utf8");
      if (!body) {
        return null;
      }

      if (
        inputPath.endsWith(".jsx") ||
        inputPath.endsWith(".js") ||
        inputPath.endsWith(".tsx") ||
        inputPath.endsWith(".ts")
      ) {
        const doc = extractDocumentFromJavascript(body.toString(), { tagName });
        return doc ? new Source(doc, inputPath) : null;
      }

      if (inputPath.endsWith(".graphql") || inputPath.endsWith(".gql")) {
        return new Source(body, inputPath);
      }

      return null;
    })
    .filter(source => source)
    .map(source => {
      try {
        return parse(source!);
      } catch {
        return null;
      }
    })
    .filter(source => source);

  return sources as DocumentNode[];
}

export function loadAndMergeQueryDocuments(
  inputPaths: string[],
  tagName: string = "gql"
): DocumentNode {
  return concatAST(loadQueryDocuments(inputPaths, tagName));
}
