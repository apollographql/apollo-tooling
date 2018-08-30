import { fs } from "./localfs";
import { stripIndents } from "common-tags";

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
