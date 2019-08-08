import { DirectiveNode, StringValueNode } from "graphql";
import { CompoundType } from "./Types";
import { parseSelections } from "apollo-graphql";

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

/**
 * Get a list of [typeName, field] for each field referenced in the given compound type
 */
export const allElements = (
  compound: CompoundType
): { objectName: string; fieldName: string }[] =>
  compound.types.flatMap(field => [
    { fieldName: field.name, objectName: field.baseType.name },
    ...(field.type instanceof CompoundType ? allElements(field.type) : [])
  ]);

/**
 * Create an error in this specific format, so that
 * in the driver code in `apollo/service/codegen`, we can
 * easily parse this and write it to console in a way VSCode
 * can recognize and provide in-editor support for.
 * See VSCode "Problem Watchers" for more info.
 */
export const makeVSCodeError = (
  startIndex: number,
  endIndex: number,
  message: string
) => `(${startIndex},${endIndex}) ${message}`;
