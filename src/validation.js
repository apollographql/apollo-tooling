import {
  validate,
  specifiedRules,
  GraphQLError
} from 'graphql';

import { ToolError, logError } from './errors'

// `specifiedRules` validates queries but codegen may run on just fragments of an actual query to the resolver.
const baseRules = specifiedRules.filter(r => !r.name.startsWith('NoUnused'));
const rules = [NoAnonymousQueries, NoExplicitTypename, NoTypenameAlias].concat(baseRules);

export function validateQueryDocument(schema, document) {
  const validationErrors = validate(schema, document, rules);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      logError(error);
    }
    throw new ToolError("Validation of GraphQL query document failed");
  }
}

export function NoAnonymousQueries(context) {
  return {
    OperationDefinition(node) {
      if (!node.name) {
        context.reportError(new GraphQLError(
          'Apollo does not support anonymous operations',
          [node]
        ));
      }
      return false;
    }
  };
}

export function NoExplicitTypename(context) {
  return {
    Field(node) {
      const fieldName = node.name.value;
      if (fieldName == "__typename") {
        context.reportError(new GraphQLError(
          'Apollo inserts __typename automatically when needed, please do not include it explicitly',
          [node]
        ));
      }
    }
  };
}

export function NoTypenameAlias(context) {
  return {
    Field(node) {
      const aliasName = node.alias && node.alias.value;
      if (aliasName == "__typename") {
        context.reportError(new GraphQLError(
          'Apollo needs to be able to insert __typename when needed, please do not use it as an alias',
          [node]
        ));
      }
    }
  };
}
