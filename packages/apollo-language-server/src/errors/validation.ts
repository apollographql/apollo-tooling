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
} from "graphql";

import { logError } from "./logger";
import { ValidationRule } from "graphql/validation/ValidationContext";
import { Debug } from "../utilities";

const specifiedRulesToBeRemoved = [NoUnusedFragmentsRule, KnownDirectivesRule];

export const defaultValidationRules: ValidationRule[] = [
  NoAnonymousQueries,
  NoTypenameAlias,
  ...specifiedRules.filter(rule => !specifiedRulesToBeRemoved.includes(rule))
];

export function getValidationErrors(
  schema: GraphQLSchema,
  document: DocumentNode,
  fragments?: { [fragmentName: string]: FragmentDefinitionNode },
  rules: ValidationRule[] = defaultValidationRules
) {
  const typeInfo = new TypeInfo(schema);

  // The 4th argument to `ValidationContext` is an `onError` callback. This was
  // introduced by https://github.com/graphql/graphql-js/pull/2074 and first
  // published in graphql@14.5.0. It is meant to replace the `getErrors` method
  // which was previously used. Since we support versions of graphql older than
  // that, it's possible that this callback will not be invoked and we'll need
  // to resort to using `getErrors`. Therefore, although we'll collect errors
  // via this callback, if `getErrors` is present on the context we create,
  // we'll go ahead and use that instead.
  const errors: GraphQLError[] = [];
  const onError = (err: GraphQLError) => errors.push(err);
  const context = new ValidationContext(schema, document, typeInfo, onError);

  if (fragments) {
    (context as any)._fragments = fragments;
  }

  const visitors = rules.map(rule => rule(context));
  // Visit the whole document with each instance of all provided rules.
  visit(document, visitWithTypeInfo(typeInfo, visitInParallel(visitors)));

  // @ts-ignore
  // `getErrors` is gone in `graphql@15`, but we still support older versions.
  if (typeof context.getErrors === "function") return context.getErrors();

  // If `getErrors` doesn't exist, we must be on a `graphql@15` or higher,
  // so we'll use the errors we collected via the `onError` callback.
  return errors;
}

export function validateQueryDocument(
  schema: GraphQLSchema,
  document: DocumentNode
) {
  try {
    const validationErrors = getValidationErrors(schema, document);
    if (validationErrors && validationErrors.length > 0) {
      for (const error of validationErrors) {
        logError(error);
      }
      return Debug.error("Validation of GraphQL query document failed");
    }
  } catch (e) {
    console.error(e);
    throw e;
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
