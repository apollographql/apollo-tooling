import { fs, withGlobalFS } from "./localfs";
import { stripIndents } from "common-tags";
import * as fg from "glob";
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

function extractDocumentsWithAST(
  content: string,
  options: {
    tagName?: string;
    parser?: any;
  }
): string[] {
  let tagName = options.tagName || "gql";

  // Sometimes the js is unparsable, so this function will throw
  const ast = recast.parse(content, {
    parser: options.parser || require("recast/parsers/babylon")
  });

  const finished: string[] = [];

  // isolate the template literals tagged with gql
  astTypes.visit(ast, {
    visitTaggedTemplateExpression(path: any) {
      const tag = path.value.tag;
      if (tag.name === tagName) {
        // This currently ignores the anti-pattern of including an interpolated
        // string as anything other than a fragment definition, for example a
        // literal(these cases could be covered during the replacement of
        // literals in the signature calcluation)
        finished.push(
          (path.value.quasi.quasis as Array<{
            value: { cooked: string; raw: string };
          }>)
            .map(({ value }) => value.cooked)
            .join("")
        );
      }
      return this.traverse(path);
    }
  });

  return finished;
}

export function extractDocumentFromJavascript(
  content: string,
  options: {
    tagName?: string;
    parser?: any;
    inputPath?: string;
  } = {}
): string | null {
  let tagName = options.tagName || "gql";

  let match;
  let matches: string[] = [];

  try {
    matches = extractDocumentsWithAST(content, options);
  } catch (e) {
    console.log(
      "Extraction using AST",
      options.inputPath ? "in file " + options.inputPath : "",
      "failed with \n",
      e,
      "\nRetrying using regex"
    );
    const re = new RegExp(tagName + "s*`([^`]*)`", "g");
    while ((match = re.exec(content))) {
      const doc = match[1].replace(/\${[^}]*}/g, "");

      matches.push(doc);
    }
  }

  matches = filterValidDocuments(matches);
  const doc = matches.join("\n");
  return doc.length ? doc : null;
}

export function loadQueryDocuments(
  inputPaths: string[],
  tagName: string = "gql"
): DocumentNode[] {
  const sources = inputPaths
    .flatMap(i =>
      withGlobalFS(() => fg.sync(i, { cwd: process.cwd(), absolute: true }))
    )
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
        let parser;
        if (inputPath.endsWith(".ts")) {
          parser = require("recast/parsers/typescript");
        } else if (inputPath.endsWith(".tsx")) {
          parser = {
            parse: (source: any, options: any) => {
              const babelParser = require("@babel/parser");
              options = require("recast/parsers/_babylon_options.js")(options);
              options.plugins.push("jsx", "typescript");
              return babelParser.parse(source, options);
            }
          };
        } else {
          parser = require("recast/parsers/babylon");
        }

        const doc = extractDocumentFromJavascript(body.toString(), {
          tagName,
          parser,
          inputPath
        });
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
