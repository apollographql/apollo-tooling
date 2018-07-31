import {
  specifiedRules,
  NoUnusedFragmentsRule,
  KnownDirectivesRule,
  GraphQLError,
  FieldNode,
  ValidationContext,
  GraphQLSchema,
  DocumentNode,
  OperationDefinitionNode,
  TypeInfo,
  FragmentDefinitionNode,
  visit,
  visitWithTypeInfo,
  visitInParallel,
  ASTVisitor,
  isNonNullType
} from "graphql";

import { ToolError, logError } from "apollo-codegen-core/lib/errors";

export function getValidationErrors(
  schema: GraphQLSchema,
  document: DocumentNode,
  fragments?: { [fragmentName: string]: FragmentDefinitionNode }
) {
  const specifiedRulesToBeRemoved = [
    NoUnusedFragmentsRule,
    KnownDirectivesRule
  ];

  const rules = [
    NoAnonymousQueries,
    NoTypenameAlias,
    CannotDeferNonNullableFields,
    ...specifiedRules.filter(rule => !specifiedRulesToBeRemoved.includes(rule))
  ];

  const typeInfo = new TypeInfo(schema);
  const context = new ValidationContext(schema, document, typeInfo);

  if (fragments) {
    (context as any)._fragments = fragments;
  }

  const visitors = rules.map(rule => rule(context));
  // Visit the whole document with each instance of all provided rules.
  visit(document, visitWithTypeInfo(typeInfo, visitInParallel(visitors)));
  return context.getErrors();
}

export function validateQueryDocument(
  schema: GraphQLSchema,
  document: DocumentNode
) {
  const validationErrors = getValidationErrors(schema, document);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      logError(error);
    }
    throw new ToolError("Validation of GraphQL query document failed");
  }
}

export function NoAnonymousQueries(context: ValidationContext) {
  return {
    OperationDefinition(node: OperationDefinitionNode) {
      if (!node.name) {
        context.reportError(
          new GraphQLError("Apollo does not support anonymous operations", [
            node
          ])
        );
      }
      return false;
    }
  };
}

export function NoTypenameAlias(context: ValidationContext) {
  return {
    Field(node: FieldNode) {
      const aliasName = node.alias && node.alias.value;
      if (aliasName == "__typename") {
        context.reportError(
          new GraphQLError(
            "Apollo needs to be able to insert __typename when needed, please do not use it as an alias",
            [node]
          )
        );
      }
    }
  };
}

export function cannotDeferOnNonNullMessage(fieldName: string): string {
  return `@defer cannot be applied on non-nullable field "${fieldName}".`;
}

export function CannotDeferNonNullableFields(
  context: ValidationContext
): ASTVisitor {
  return {
    Directive(node) {
      const fieldDef = context.getFieldDef()!;
      if (node.name.value === "defer" && isNonNullType(fieldDef.type)) {
        context.reportError(
          new GraphQLError(
            cannotDeferOnNonNullMessage(
              `${context.getParentType()}.${fieldDef.name}`
            ),
            [node]
          )
        );
      }
      return;
    }
  };
}
