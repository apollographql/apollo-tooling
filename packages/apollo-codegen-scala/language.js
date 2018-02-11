import {
  join,
  wrap,
} from '../utilities/printing';

export function comment(generator, comment) {
  const split = comment ? comment.split('\n') : [];
  if (split.length > 0) {
    generator.printOnNewline('/**')
    split.forEach(line => {
      generator.printOnNewline(` * ${line.trim()}`);
    });

    generator.printOnNewline(' */');
  }
}

export function packageDeclaration(generator, pkg) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(`package ${pkg}`);
  generator.popScope();
}

export function objectDeclaration(generator, { objectName, superclass, properties }, closure) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(`object ${objectName}` + (superclass ? ` extends ${superclass}` : ''));
  generator.pushScope({ typeName: objectName });
  generator.withinBlock(closure);
  generator.popScope();
}

export function caseClassDeclaration(generator, { caseClassName, description, superclass, params }, closure) {
  generator.printNewlineIfNeeded();
  comment(generator, description);
  generator.printOnNewline(`case class ${caseClassName}(${(params || []).map(v => v.name + ": " + v.type).join(', ')})` + (superclass ? ` extends ${superclass}` : ''));
  generator.pushScope({ typeName: caseClassName });
  generator.withinBlock(closure);
  generator.popScope();
}

export function propertyDeclaration(generator, { propertyName, typeName, description}, closure) {
  comment(generator, description);
  generator.printOnNewline(`val ${propertyName}: ${typeName} =`);
  generator.withinBlock(closure);
}

export function propertyDeclarations(generator, declarations) {
  declarations.forEach(o => {
    propertyDeclaration(generator, o);
  });
}

const reservedKeywords = new Set(
  'case', 'catch', 'class', 'def', 'do', 'else',
  'extends', 'false', 'final', 'for', 'if', 'match',
  'new', 'null', 'throw', 'trait', 'true', 'try', 'until',
  'val', 'var', 'while', 'with'
);

export function escapeIdentifierIfNeeded(identifier) {
  if (reservedKeywords.has(identifier)) {
    return '`' + identifier + '`';
  } else {
    return identifier;
  }
}
