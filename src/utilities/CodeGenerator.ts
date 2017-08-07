export default class CodeGenerator<Context = any> {
  private scopeStack: any[] = [];
  private indentWidth = 2;
  private indentLevel = 0;
  public output = '';
  private startOfIndentLevel = false;

  constructor(public context: Context) {

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

  withinBlock(closure: Function, open = ' {', close = '}') {
    this.print(open);
    this.withIndent(closure);
    this.printOnNewline(close);
  }
}
