import {
  join,
  wrap,
} from './printing';

import {Context} from '../generate';

export default class CodeGenerator {
  public indentWidth = 2;
  public indentLevel = 0;
  public output = '';
  public startOfIndentLevel?: boolean;
  public scopeStack: any[];

  constructor(public context: Context) {
    this.context = context;
    
    this.scopeStack = [];
  }

  pushScope(scope: any) {
    this.scopeStack.push(scope);
  }

  popScope() {
    return this.scopeStack.pop();
  }

  print(maybeString?: string) {
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
    if (!this.startOfIndentLevel) {
      this.printNewline();
    }
  }

  printOnNewline(maybeString?: string) {
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

  withIndent(closure: Function) {
    if (!closure) return;

    this.indentLevel++;
    this.startOfIndentLevel = true;
    closure();
    this.indentLevel--;
  }

  withinBlock(closure: Function) {
    this.print(' {');
    this.withIndent(closure);
    this.printOnNewline('}');
  }
}
