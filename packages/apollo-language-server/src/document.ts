import { parse, Source, DocumentNode } from "graphql";
import { SourceLocation, getLocation } from "graphql/language/location";

import {
  TextDocument,
  Position,
  Diagnostic,
  DiagnosticSeverity,
} from "vscode-languageserver";

import { getRange as rangeOfTokenAtLocation } from "@apollographql/graphql-language-service-interface/dist/getDiagnostics";

import {
  positionFromSourceLocation,
  rangeInContainingDocument,
} from "./utilities/source";

export class GraphQLDocument {
  ast?: DocumentNode;
  syntaxErrors: Diagnostic[] = [];

  constructor(public source: Source) {
    try {
      this.ast = parse(source);
    } catch (error) {
      // Don't add syntax errors when GraphQL has been commented out
      if (maybeCommentedOut(source.body)) return;

      // A GraphQL syntax error only has a location and no node, because we don't have an AST
      // So we use the online parser to get the range of the token at that location
      const range = rangeInContainingDocument(
        source,
        rangeOfTokenAtLocation(error.locations[0], source.body)
      );
      this.syntaxErrors.push({
        severity: DiagnosticSeverity.Error,
        message: error.message,
        source: "GraphQL: Syntax",
        range,
      });
    }
  }

  containsPosition(position: Position): boolean {
    if (position.line < this.source.locationOffset.line - 1) return false;
    const end = positionFromSourceLocation(
      this.source,
      getLocation(this.source, this.source.body.length)
    );
    return position.line <= end.line;
  }
}

export function extractGraphQLDocuments(
  document: TextDocument,
  tagName: string = "gql"
): GraphQLDocument[] | null {
  switch (document.languageId) {
    case "graphql":
      return [
        new GraphQLDocument(new Source(document.getText(), document.uri)),
      ];
    case "javascript":
    case "javascriptreact":
    case "typescript":
    case "typescriptreact":
    case "vue":
      return extractGraphQLDocumentsFromJSTemplateLiterals(document, tagName);
    case "python":
      return extractGraphQLDocumentsFromPythonStrings(document, tagName);
    case "ruby":
      return extractGraphQLDocumentsFromRubyStrings(document, tagName);
    case "dart":
      return extractGraphQLDocumentsFromDartStrings(document, tagName);
    case "reason":
      return extractGraphQLDocumentsFromReasonStrings(document, tagName);
    case "elixir":
      return extractGraphQLDocumentsFromElixirStrings(document, tagName);
    default:
      return null;
  }
}

function extractGraphQLDocumentsFromJSTemplateLiterals(
  document: TextDocument,
  tagName: string
): GraphQLDocument[] | null {
  const text = document.getText();

  const documents: GraphQLDocument[] = [];

  const regExp = new RegExp(`${tagName}\\s*\`([\\s\\S]+?)\``, "gm");

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[1]);
    const position = document.positionAt(result.index + (tagName.length + 1));
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    documents.push(new GraphQLDocument(source));
  }

  if (documents.length < 1) return null;

  return documents;
}

function extractGraphQLDocumentsFromPythonStrings(
  document: TextDocument,
  tagName: string
): GraphQLDocument[] | null {
  const text = document.getText();

  const documents: GraphQLDocument[] = [];

  const regExp = new RegExp(
    `\\b(${tagName}\\s*\\(\\s*[bfru]*("(?:"")?|'(?:'')?))([\\s\\S]+?)\\2\\s*\\)`,
    "gm"
  );

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[3]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    documents.push(new GraphQLDocument(source));
  }

  if (documents.length < 1) return null;

  return documents;
}

function extractGraphQLDocumentsFromRubyStrings(
  document: TextDocument,
  tagName: string
): GraphQLDocument[] | null {
  const text = document.getText();

  const documents: GraphQLDocument[] = [];

  const regExp = new RegExp(`(<<-${tagName})([\\s\\S]+?)${tagName}`, "gm");

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[2]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    documents.push(new GraphQLDocument(source));
  }

  if (documents.length < 1) return null;

  return documents;
}

function extractGraphQLDocumentsFromDartStrings(
  document: TextDocument,
  tagName: string
): GraphQLDocument[] | null {
  const text = document.getText();

  const documents: GraphQLDocument[] = [];

  const regExp = new RegExp(
    `\\b(${tagName}\\(\\s*r?("""|'''))([\\s\\S]+?)\\2\\s*\\)`,
    "gm"
  );

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[3]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    documents.push(new GraphQLDocument(source));
  }

  if (documents.length < 1) return null;

  return documents;
}

function extractGraphQLDocumentsFromReasonStrings(
  document: TextDocument,
  tagName: string
): GraphQLDocument[] | null {
  const text = document.getText();

  const documents: GraphQLDocument[] = [];

  const reasonFileFilter = new RegExp(/(\[%(graphql|relay\.))/g);

  if (!reasonFileFilter.test(text)) {
    return documents;
  }

  const reasonRegexp = new RegExp(
    /(?<=\[%(graphql|relay\.\w*)[\s\S]*{\|)[.\s\S]+?(?=\|})/gm
  );

  let result;
  while ((result = reasonRegexp.exec(text)) !== null) {
    const contents = result[0];
    const position = document.positionAt(result.index);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    documents.push(new GraphQLDocument(source));
  }

  if (documents.length < 1) return null;

  return documents;
}

function extractGraphQLDocumentsFromElixirStrings(
  document: TextDocument,
  tagName: string
): GraphQLDocument[] | null {
  const text = document.getText();
  const documents: GraphQLDocument[] = [];

  const regExp = new RegExp(
    `\\b(${tagName}\\(\\s*r?("""))([\\s\\S]+?)\\2\\s*\\)`,
    "gm"
  );

  let result;
  while ((result = regExp.exec(text)) !== null) {
    const contents = replacePlaceholdersWithWhiteSpace(result[3]);
    const position = document.positionAt(result.index + result[1].length);
    const locationOffset: SourceLocation = {
      line: position.line + 1,
      column: position.character + 1,
    };
    const source = new Source(contents, document.uri, locationOffset);
    documents.push(new GraphQLDocument(source));
  }

  if (documents.length < 1) return null;

  return documents;
}

function replacePlaceholdersWithWhiteSpace(content: string) {
  return content.replace(/\$\{([\s\S]+?)\}/gm, (match) => {
    return Array(match.length).join(" ");
  });
}

function maybeCommentedOut(content: string) {
  return (
    (content.indexOf("/*") > -1 && content.indexOf("*/") > -1) ||
    content.split("//").length > 1
  );
}
