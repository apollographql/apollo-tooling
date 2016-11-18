import {
  validate,
  specifiedRules,
  GraphQLError
} from 'graphql';

import { ToolError, logError } from './errors'

export function validateQueryDocument(schema, document) {
  const rules = [NoAnonymousQueries].concat(specifiedRules);

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
          'Apollo iOS does not support anonymous operations',
          [node]
        ));
      }
      return false;
    }
  };
}
