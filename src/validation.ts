import {
  validate,
  specifiedRules,
  GraphQLError,
  GraphQLSchema,
  DocumentNode,
  ValidationContext,
  OperationDefinitionNode,
  FieldNode
} from 'graphql';

import { ToolError, logError } from './errors'

export function validateQueryDocument(schema: GraphQLSchema, document: DocumentNode) {
  const rules = [NoAnonymousQueries, NoExplicitTypename, NoTypenameAlias].concat(specifiedRules);

  const validationErrors = validate(schema, document, rules);
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
        context.reportError(new GraphQLError(
          'Apollo iOS does not support anonymous operations',
          [node]
        ));
      }
      return false;
    }
  };
}

export function NoExplicitTypename(context: ValidationContext) {
  return {
    Field(node: FieldNode) {
      const fieldName = node.name.value;
      if (fieldName == "__typename") {
        context.reportError(new GraphQLError(
          'Apollo iOS inserts __typename automatically when needed, please do not include it explicitly',
          [node]
        ));
      }
    }
  };
}

export function NoTypenameAlias(context: ValidationContext) {
  return {
    Field(node: FieldNode) {
      const aliasName = node.alias && node.alias.value;
      if (aliasName == "__typename") {
        context.reportError(new GraphQLError(
          'Apollo iOS needs to be able to insert __typename when needed, please do not use it as an alias',
          [node]
        ));
      }
    }
  };
}
