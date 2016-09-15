import {
  validate,
  specifiedRules,
  GraphQLError
} from 'graphql';

import { ToolError, logError } from './errors'

export function validateQueryDocument(schema, document) {
  const rules = [NoAnonymousQueries, FragmentsNotSupported].concat(specifiedRules);

  const validationErrors = validate(schema, document, rules);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      logError(error);
    }
    throw new ToolError("Validation of GraphQL query document failed");
  }
}

function fixNodeLocation(node) {
  // FIXME: Workaround for bug in graphql-js, see https://github.com/graphql/graphql-js/pull/487
  if (node.loc.start === 0) {
    node.loc.start = 1;
  }
}

export function NoAnonymousQueries(context) {
  return {
    OperationDefinition(node) {
      if (!node.name) {
        fixNodeLocation(node);
        context.reportError(new GraphQLError(
          'Anonymous operations are not supported by Apollo iOS',
          [node]
        ));
      }
      return false;
    }
  };
}

export function FragmentsNotSupported(context) {
  return {
    FragmentDefinition: notSupported,
    FragmentSpread: notSupported,
    InlineFragment: notSupported
  };

  function notSupported(node) {
    fixNodeLocation(node);
    context.reportError(new GraphQLError(
      'Fragments are not yet supported by Apollo iOS',
      [node]
    ));
    return false;
  }
}
