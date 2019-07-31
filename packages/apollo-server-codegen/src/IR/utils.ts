import {
  parse,
  OperationDefinitionNode,
  FieldNode,
  DirectiveNode,
  StringValueNode
} from "graphql";

// number of chars added before the source code in in the below parse(`query { ${source} }`) call.
// This is needed for converting between the `loc` property `parse` will add to these FieldNode's,
// and the real location of errors in the source document
export const SELECTION_OFFSET = 7;
const parseSelections = (source: string) =>
  ((parse(`query { ${source} }`).definitions[0] as OperationDefinitionNode)
    .selectionSet.selections as (readonly FieldNode[])).map(node => ({
    ...node
  }));

/**
 * Finds all directives of the specified kind and gathers their selection sets.
 */
export const findFederationDirectivesWithSelections = (
  directives: readonly DirectiveNode[] | undefined,
  name: "requires" | "provides" | "key"
) =>
  (directives || [])
    .filter(
      directive =>
        directive.name.value === name &&
        directive.arguments &&
        directive.arguments[0] &&
        directive.arguments[0].name.value === "fields" &&
        directive.arguments[0].value.kind === "StringValue" &&
        directive.arguments[0].value.value
    )
    .map(directive => ({
      ...directive,
      selections: parseSelections(
        (directive.arguments![0].value as StringValueNode).value
      )
    }));
