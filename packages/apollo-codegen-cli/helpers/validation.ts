import {
  validate,
  specifiedRules,
  NoUnusedFragmentsRule,
  KnownDirectivesRule,
  GraphQLError,
  FieldNode,
  ValidationContext,
  GraphQLSchema,
  DocumentNode,
  OperationDefinitionNode
} from 'graphql';

import { ToolError, logError } from './errors';

export function validateQueryDocument(schema: GraphQLSchema, document: DocumentNode) {
  const specifiedRulesToBeRemoved = [NoUnusedFragmentsRule, KnownDirectivesRule];

  const rules = [
    NoAnonymousQueries,
    NoTypenameAlias,
    ...specifiedRules.filter(rule => !specifiedRulesToBeRemoved.includes(rule))
  ];

  const validationErrors = validate(schema, document, rules);
  if (validationErrors && validationErrors.length > 0) {
    for (const error of validationErrors) {
      logError(error);
    }
    throw new ToolError('Validation of GraphQL query document failed');
  }
}

export function NoAnonymousQueries(context: ValidationContext) {
  return {
    OperationDefinition(node: OperationDefinitionNode) {
      if (!node.name) {
        context.reportError(new GraphQLError('Apollo does not support anonymous operations', [node]));
      }
      return false;
    }
  };
}

export function NoTypenameAlias(context: ValidationContext) {
  return {
    Field(node: FieldNode) {
      const aliasName = node.alias && node.alias.value;
      if (aliasName == '__typename') {
        context.reportError(
          new GraphQLError(
            'Apollo needs to be able to insert __typename when needed, please do not use it as an alias',
            [node]
          )
        );
      }
    }
  };
}
