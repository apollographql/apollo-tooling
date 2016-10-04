// Code generation helper functions copied from graphql-js (https://github.com/graphql/graphql-js)

/**
 * Given maybeArray, print an empty string if it is null or empty, otherwise
 * print all items together separated by separator if provided
 */
export function join(maybeArray, separator) {
  return maybeArray ? maybeArray.filter(x => x).join(separator || '') : '';
}

/**
 * If maybeString is not null or empty, then wrap with start and end, otherwise
 * print an empty string.
 */
export function wrap(start, maybeString, end) {
  return maybeString ?
    start + maybeString + (end || '') :
    '';
}
