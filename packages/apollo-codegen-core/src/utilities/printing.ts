// Code generation helper functions copied from graphql-js (https://github.com/graphql/graphql-js)

/**
 * Given maybeArray, print an empty string if it is null or empty, otherwise
 * print all items together separated by separator if provided
 */
export function join(maybeArray?: any[], separator?: string) {
  return maybeArray ? maybeArray.filter(x => x).join(separator || "") : "";
}

/**
 * Given array, print each item on its own line, wrapped in an
 * indented "{ }" block.
 */
export function block(array: any[]) {
  return array && array.length !== 0
    ? indent("{\n" + join(array, "\n")) + "\n}"
    : "{}";
}

/**
 * If maybeString is not null or empty, then wrap with start and end, otherwise
 * print an empty string.
 */
export function wrap(start: string, maybeString?: string, end?: string) {
  return maybeString ? start + maybeString + (end || "") : "";
}

export function indent(maybeString?: string) {
  return maybeString && maybeString.replace(/\n/g, "\n  ");
}

/**
 * Generates the body of a JSDoc style comment
 */
export function commentBlockContent(commentString: string) {
  return (
    "*\n" +
    commentString
      .split("\n")
      .map(line => ` * ${line.replace("*/", "")}`)
      .join("\n") +
    "\n "
  );
}
