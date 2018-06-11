import { LegacyCompilerContext } from '../compiler/legacyIR';
import CodeGenerator from '../utilities/CodeGenerator';

export function escapedString(string: string) {
  return string.replace(/"/g, '\\"');
}

export function multilineString(generator: CodeGenerator<LegacyCompilerContext, any>, string: string) {
  const lines = string.split('\n');
  lines.forEach((line, index) => {
    const isLastLine = index != lines.length - 1;
    generator.printOnNewline(`"${escapedString(line)}"` + (isLastLine ? ' +' : ''));
  });
}
