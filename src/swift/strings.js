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
