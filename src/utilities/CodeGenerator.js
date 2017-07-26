import {
  join,
  wrap,
} from './printing';

export default class CodeGenerator {
  constructor(context) {
    this.context = context;
    
    this.scopeStack = [];
    this.queue = [];

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
    if (!this.startOfIndentLevel) {
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

  withinBlock(closure, open = ' {', close = '}', closeOnNewLine = true) {
    this.print(open);
    this.withIndent(closure);
    if (closeOnNewLine) {
      this.printOnNewline(close);
    } else {
      this.print(close);
    }
  }

  queueBlock(closure, open = ' {', close = '}') {
    this.queue.push(closure);
  }

  flushQueued(closure) {
    while (this.queue.length > 0) {
      this.queue.pop()();
    }
  }
}
