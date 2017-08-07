import { Argument } from '../compiler/legacyIR';

import CodeGenerator from '../utilities/CodeGenerator';

import { join, wrap } from '../utilities/printing';

export function escapedString(string: string) {
  return string.replace(/"/g, '\\"');
}

export function multilineString(generator: CodeGenerator, string: string) {
  const lines = string.split('\n');
  lines.forEach((line, index) => {
    const isLastLine = index != lines.length - 1;
    generator.printOnNewline(`"${escapedString(line)}"` + (isLastLine ? ' +' : ''));
  });
}

export function dictionaryLiteralForFieldArguments(args: Argument[]) {
  function expressionFromValue(value: any): string {
    if (value.kind === 'Variable') {
      return `Variable("${value.variableName}")`;
    } else if (Array.isArray(value)) {
      return wrap('[', join(value.map(expressionFromValue), ', '), ']');
    } else if (typeof value === 'object') {
      return wrap(
        '[',
        join(
          Object.entries(value).map(([key, value]) => {
            return `"${key}": ${expressionFromValue(value)}`;
          }),
          ', '
        ) || ':',
        ']'
      );
    } else {
      return JSON.stringify(value);
    }
  }

  return wrap(
    '[',
    join(
      args.map(arg => {
        return `"${arg.name}": ${expressionFromValue(arg.value)}`;
      }),
      ', '
    ) || ':',
    ']'
  );
}
