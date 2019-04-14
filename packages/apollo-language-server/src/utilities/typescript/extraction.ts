import * as ts from "typescript";

function findClosestParent(node: ts.Node, kind: ts.SyntaxKind): ts.Node | null {
  let current: ts.Node | null = node;
  while (current && current.kind !== kind) {
    current = current.parent;
  }

  return current;
}

function getCommentText(code: string, range: ts.CommentRange): string {
  return code.substring(range.pos, range.end);
}

function shouldProcessNode(
  tagName: string,
  sourceCode: string,
  node: ts.Node
): node is ts.TaggedTemplateExpression {
  if (!ts.isTaggedTemplateExpression(node) || node.tag.getText() !== tagName) {
    return false;
  }

  const variableNode = findClosestParent(
    node,
    ts.SyntaxKind.VariableDeclarationList
  );

  // document not declared via const/let
  // don't try finding leading comments and just process the node
  if (!variableNode) {
    return true;
  }

  const comments = ts.getLeadingCommentRanges(
    sourceCode,
    variableNode.getFullStart()
  );

  const ignored =
    comments &&
    comments.some(
      c => getCommentText(sourceCode, c).indexOf("@codegen-ignore") > -1
    );

  return !ignored;
}

function reduceTemplateLiterals(
  tagName: string,
  sourceCode: string,
  result: string[],
  node: ts.Node
): void {
  if (shouldProcessNode(tagName, sourceCode, node)) {
    result.push(node.template.getText().slice(1, -1));
  }
  node.forEachChild(child =>
    reduceTemplateLiterals(tagName, sourceCode, result, child)
  );
}

function extractTemplateLiterals(
  tagName: string,
  sourceCode: string
): string[] {
  const sourceFile = ts.createSourceFile(
    "dummy.ts",
    sourceCode,
    ts.ScriptTarget.Latest,
    true
  );
  const contents: string[] = [];
  reduceTemplateLiterals(tagName, sourceCode, contents, sourceFile);
  return contents;
}

export { extractTemplateLiterals };
