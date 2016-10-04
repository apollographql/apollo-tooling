import {
  join,
  wrap,
} from './utilities/printing';

export default class CodeGenerator {
  constructor() {
    this.scopeStack = [];

    this.indentWidth = 2;
    this.indentLevel = 0;

    this.output = '';
  }

  pushScope(scope) {
    this.scopeStack.push(scope);
  }

  popScope() {
    return this.scopeStack.pop();
  }

  print(maybeString) {
    if (maybeString) {
      this.output += maybeString;
    }
  }

  printNewline() {
    if (this.output) {
      this.print('\n');
      this.startOfIndentLevel = false;
    }
  }

  printNewlineIfNeeded() {
    if (!this.startOfIndentLevelLevel) {
      this.printNewline();
    }
  }

  printOnNewline(maybeString) {
    if (maybeString) {
      this.printNewline();
      this.printIndent();
      this.print(maybeString);
    }
  }

  printIndent() {
    const indentation = ' '.repeat(this.indentLevel * this.indentWidth);
    this.output += indentation;
  }

  withIndent(closure) {
    if (!closure) return;

    this.indentLevel++;
    this.startOfIndentLevel = true;
    closure();
    this.indentLevel--;
  }

  withinBlock(closure) {
    this.print(' {');
    this.withIndent(closure);
    this.printOnNewline('}');
  }
}
