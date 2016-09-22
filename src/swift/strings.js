export function escapedString(string) {
  return string.replace(/"/g, '\\"');
}

export function multilineString(string) {
  const lines = string.split('\n');
  return lines.map((line, index) => {
    const isLastLine = index != lines.length - 1;
    return `"${escapedString(line)}"` + (isLastLine ? ' +' : '');
  }).join('\n');
}
