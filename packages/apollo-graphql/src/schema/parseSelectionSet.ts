import { parse, OperationDefinitionNode, FieldNode } from "graphql";

/** number of chars added before the source code in in the below parse(`query { ${source} }`) call.
 * This is needed for converting between the `loc` property `parse` will add to these FieldNode's,
 * and the real location of errors in the source document
 */
export const SELECTION_OFFSET = 7;
export const parseSelections = (source: string) =>
  ((parse(`query { ${source} }`).definitions[0] as OperationDefinitionNode)
    .selectionSet.selections as (readonly FieldNode[])).map(node => ({
    ...node
  }));
