import {
  Source,
  ASTNode,
  Kind,
  visit,
  BREAK,
  TypeInfo,
  GraphQLSchema,
  visitWithTypeInfo,
} from "graphql";
import { Position } from "graphql-language-service";
import { SourceLocation, getLocation } from "graphql/language/location";

import { Position as VSCodePosition, Range } from "vscode-languageserver";


export function positionFromPositionInContainingDocument(
  source: Source,
  position: VSCodePosition
) {
  if (!source.locationOffset) {
    return new Position(position.line, position.character);
  }

  return new Position(
    position.line - (source.locationOffset.line - 1),
    position.character
  );
}

export function positionInContainingDocument(
  source: Source,
  position: VSCodePosition
): VSCodePosition {
  if (!source.locationOffset) return position;
  return VSCodePosition.create(
    source.locationOffset.line - 1 + position.line,
    position.character
  );
}

export function rangeInContainingDocument(source: Source, range: Range): Range {
  if (!source.locationOffset) return range;
  return Range.create(
    positionInContainingDocument(source, range.start),
    positionInContainingDocument(source, range.end)
  );
}

export function rangeForASTNode(node: ASTNode): Range {
  const location = node.loc!;
  const source = location.source;

  return Range.create(
    positionFromSourceLocation(source, getLocation(source, location.start)),
    positionFromSourceLocation(source, getLocation(source, location.end))
  );
}

export function positionFromSourceLocation(
  source: Source,
  location: SourceLocation
) {
  return VSCodePosition.create(
    (source.locationOffset ? source.locationOffset.line - 1 : 0) +
      location.line -
      1,
    (source.locationOffset && location.line === 1
      ? source.locationOffset.column - 1
      : 0) +
      location.column -
      1
  );
}

export function positionToOffset(source: Source, position: Position): number {
  const lineRegexp = /\r\n|[\n\r]/g;
  const lineEndingLength = /\r\n/g.test(source.body) ? 2 : 1;

  const linesUntilPosition = source.body
    .split(lineRegexp)
    .slice(0, position.line);
  return (
    position.character +
    linesUntilPosition
      .map(
        (line) => line.length + lineEndingLength // count EOL
      )
      .reduce((a, b) => a + b, 0)
  );
}

export function getASTNodeAndTypeInfoAtPosition(
  source: Source,
  position: Position,
  root: ASTNode,
  schema: GraphQLSchema
): [ASTNode, TypeInfo] | null {
  const offset = positionToOffset(source, position);

  let nodeContainingPosition: ASTNode | null = null;

  const typeInfo = new TypeInfo(schema);
  visit(
    root,
    visitWithTypeInfo(typeInfo, {
      enter(node: ASTNode) {
        if (
          node.kind !== Kind.NAME && // We're usually interested in their parents
          node.loc &&
          node.loc.start <= offset &&
          offset <= node.loc.end
        ) {
          nodeContainingPosition = node;
        } else {
          return false;
        }
        return;
      },
      leave(node: ASTNode) {
        if (node.loc && node.loc.start <= offset && offset <= node.loc.end) {
          return BREAK;
        }
        return;
      },
    })
  );

  if (nodeContainingPosition) {
    return [nodeContainingPosition, typeInfo];
  } else {
    return null;
  }
}
