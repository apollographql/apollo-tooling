import * as t from '@babel/types';
import generate from '@babel/generator';
import { stripIndent } from 'common-tags';

export class GeneratedFile<Scope = any> {
  scopeStack: Scope[] = [];
  indentWidth = 2;
  indentLevel = 0;
  startOfIndentLevel = false;

  public output = '';

  pushScope(scope: Scope) {
    this.scopeStack.push(scope);
  }

  popScope() {
    return this.scopeStack.pop();
  }

  get scope(): Scope {
    if (this.scopeStack.length < 1) throw new Error('No active scope');

    return this.scopeStack[this.scopeStack.length - 1];
  }

  print(string?: string) {
    if (string) {
      this.output += string;
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

  fixCommas(documentPart: string) {
    const lines = documentPart.split('\n');
    let currentLine = 0;
    let nextLine;
    const newDocumentParts = [];
    // Keep track of what column comments should start on
    // to keep things aligned
    let maxCommentColumn = 0;

    while (currentLine !== lines.length) {
      nextLine = currentLine + 1;
      const strippedNextLine = stripIndent`${lines[nextLine]}`;
      if (strippedNextLine.length === 1 && strippedNextLine[0] === ',') {
        const currentLineContents = lines[currentLine];
        const commentColumn = currentLineContents.indexOf('//');
        if (maxCommentColumn < commentColumn) {
          maxCommentColumn = commentColumn;
        }

        const [contents, comment] = currentLineContents.split('//');
        newDocumentParts.push({
          main: contents.replace(/\s+$/g, '') + ',',
          comment: comment.trim()
        });
        currentLine++;
      } else {
        newDocumentParts.push({
          main: lines[currentLine],
          comment: null
        });
      }

      currentLine++;
    }

    return newDocumentParts.reduce((memo, part) => {
      const {
        main,
        comment
      } = part;

      let line;
      if (comment !== null) {
        const spacesBetween = maxCommentColumn - main.length;
        line = `${main}${' '.repeat(spacesBetween)} // ${comment}`
      } else {
        line = main;
      }

      return [
        ...memo,
        line
      ];
    }, []).join('\n');
  }

  printOnNewline(printable?: Printable) {

    this.printNewline();
    this.printIndent();
    if (typeof printable === 'string') {
      this.print(printable);
    } else {
      const documentPart = generate(printable as t.Node).code;
      this.print(this.fixCommas(documentPart));
      this.printNewline();
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

type Printable = t.Node | string;

export default class CodeGenerator<Context = any, Scope = any> {
  generatedFiles: { [fileName: string]: GeneratedFile<Scope> } = {};
  currentFile: GeneratedFile<Scope>;

  constructor(public context: Context) {
    this.currentFile = new GeneratedFile();
  }

  withinFile(fileName: string, closure: Function) {
    let file = this.generatedFiles[fileName];
    if (!file) {
      file = new GeneratedFile();
      this.generatedFiles[fileName] = file;
    }
    const oldCurrentFile = this.currentFile;
    this.currentFile = file;
    closure();
    this.currentFile = oldCurrentFile;
  }

  get output(): string {
    return this.currentFile.output;
  }

  pushScope(scope: Scope) {
    this.currentFile.pushScope(scope);
  }

  popScope() {
    this.currentFile.popScope();
  }

  get scope(): Scope {
    return this.currentFile.scope;
  }

  print(string?: string) {
    this.currentFile.print(string);
  }

  printNewline() {
    this.currentFile.printNewline();
  }

  printNewlineIfNeeded() {
    this.currentFile.printNewlineIfNeeded();
  }

  printOnNewline(printable?: Printable) {
    this.currentFile.printOnNewline(printable);
  }

  printIndent() {
    this.currentFile.printIndent();
  }

  withIndent(closure: Function) {
    this.currentFile.withIndent(closure);
  }

  withinBlock(closure: Function, open = ' {', close = '}') {
    this.currentFile.withinBlock(closure, open, close);
  }
}
