import {
  join,
  wrap,
} from '../utilities/printing';

export function escapedString(string) {
  return string.replace(/"/g, '\\"');
}

export function multilineString(context, string) {
  const lines = string.split('\n');
  lines.forEach((line, index) => {
    const isLastLine = index != lines.length - 1;
    context.printOnNewline(`"${escapedString(line)}"` + (isLastLine ? ' +' : ''));
  });
}

export function literalFromValue(value) {
  if (Array.isArray(value)) {
    return wrap('[', join(value.map(literalFromValue), ', '), ']');
  } else if (typeof value === 'object') {
    return wrap('[', join(Object.entries(value).map(([key, value]) => {
      return `"${key}": ${literalFromValue(value)}`;
    }), ', '), ']');
  } else {
    return JSON.stringify(value);
  }
}
