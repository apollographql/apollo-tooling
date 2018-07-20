import {
  GraphQLSchema,
  TypeInfo,
  DocumentNode,
  GraphQLError,
  visit,
  visitWithTypeInfo,
  visitInParallel,
  ValidationContext,
  specifiedRules,
  FragmentDefinitionNode,
  NoUnusedFragmentsRule,
  findDeprecatedUsages
} from "graphql";

import { Diagnostic, DiagnosticSeverity } from "vscode-languageserver";

import { GraphQLDocument } from "./document";
import { highlightNodeForNode } from "./utilities/graphql";
import { rangeForASTNode } from "./utilities/source";

export function collectDiagnostics(
  schema: GraphQLSchema,
  queryDocument: GraphQLDocument,
  fragments: { [fragmentName: string]: FragmentDefinitionNode },
  customRules: ValidationRule[] = []
): Diagnostic[] {
  const ast = queryDocument.ast;
  if (!ast) return queryDocument.syntaxErrors;

  const diagnostics = [];

  for (const error of validate(schema, ast, fragments, customRules)) {
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

type ValidationRule = (context: ValidationContext) => any;

// This is a modified version of the corresponding function in graphql-js,
// that allows us to pass in fragments without making these part of the document to be validated.
export function validate(
  schema: GraphQLSchema,
  documentAST: DocumentNode,
  fragments: { [fragmentName: string]: FragmentDefinitionNode },
  customRules: ValidationRule[] = []
): ReadonlyArray<GraphQLError> {
  const rulesToSkip = [NoUnusedFragmentsRule];
  const rules = [
    ...specifiedRules.filter(rule => !rulesToSkip.includes(rule)),
    ...customRules
  ];

  const typeInfo = new TypeInfo(schema);
  const context = new ValidationContext(schema, documentAST, typeInfo);
  (context as any)._fragments = fragments;
  const visitors = rules.map(rule => rule(context));
  // Visit the whole document with each instance of all provided rules.
  visit(documentAST, visitWithTypeInfo(typeInfo, visitInParallel(visitors)));
  return context.getErrors();
}
