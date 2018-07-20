import {
  GraphQLSchema,
  GraphQLError,
  FragmentDefinitionNode,
  findDeprecatedUsages
} from "graphql";

import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";

import { GraphQLDocument } from "./document";
import { highlightNodeForNode } from "./utilities/graphql";
import { rangeForASTNode } from "./utilities/source";

import { getValidationErrors } from "apollo/lib/validation";

export function collectDiagnostics(
  schema: GraphQLSchema,
  queryDocument: GraphQLDocument,
  fragments: { [fragmentName: string]: FragmentDefinitionNode }
): Diagnostic[] {
  const ast = queryDocument.ast;
  if (!ast) return queryDocument.syntaxErrors;

  const diagnostics = [];

  for (const error of getValidationErrors(schema, ast, fragments)) {
    diagnostics.push(
      ...diagnosticsFromError(error, DiagnosticSeverity.Error, "Validation")
    );
  }

  for (const error of findDeprecatedUsages(schema, ast)) {
    diagnostics.push(
      ...diagnosticsFromError(error, DiagnosticSeverity.Warning, "Deprecation")
    );
  }

  return diagnostics;
}

function diagnosticsFromError(
  error: GraphQLError,
  severity: DiagnosticSeverity,
  type: string
): Diagnostic[] {
  if (!error.nodes) {
    return [];
  }

  return error.nodes.map(node => {
    return {
      source: `GraphQL: ${type}`,
      message: error.message,
      severity,
      range: rangeForASTNode(highlightNodeForNode(node) || node)
    };
  });
}
