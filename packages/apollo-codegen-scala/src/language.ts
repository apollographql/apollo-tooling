import CodeGenerator from "apollo-codegen-core/lib/utilities/CodeGenerator";
import { LegacyCompilerContext } from "apollo-codegen-core/lib/compiler/legacyIR";

export interface Property {
  propertyName: string;
  typeName: string;
  caseClassName?: string;
  isOptional?: boolean;
  isList?: boolean;
  description?: string;
}

export function comment(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  comment: string
) {
  const split = comment ? comment.split("\n") : [];
  if (split.length > 0) {
    generator.printOnNewline("/**");
    split.forEach(line => {
      generator.printOnNewline(` * ${line.trim()}`);
    });

    generator.printOnNewline(" */");
  }
}

export function packageDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  pkg: string
) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(`package ${pkg}`);
  generator.popScope();
}

export function objectDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    objectName,
    superclass
  }: {
    objectName: string;
    superclass?: string;
  },
  closure?: () => void
) {
  generator.printNewlineIfNeeded();
  generator.printOnNewline(
    `object ${objectName}` + (superclass ? ` extends ${superclass}` : "")
  );
  generator.pushScope({ typeName: objectName });
  if (closure) {
    generator.withinBlock(closure);
  }
  generator.popScope();
}

export function caseClassDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    caseClassName,
    description,
    superclass,
    params
  }: {
    caseClassName: string;
    description?: string;
    superclass?: string;
    params?: {
      name: string;
      type: string;
      defaultValue?: string;
    }[];
  },
  closure?: () => void
) {
  generator.printNewlineIfNeeded();

  if (description) {
    comment(generator, description);
  }

  const paramsSection = (params || [])
    .map(v => {
      return (
        v.name + ": " + v.type + (v.defaultValue ? ` = ${v.defaultValue}` : "")
      );
    })
    .join(", ");

  generator.printOnNewline(
    `case class ${caseClassName}(${paramsSection})` +
      (superclass ? ` extends ${superclass}` : "")
  );
  generator.pushScope({ typeName: caseClassName });
  if (closure) {
    generator.withinBlock(closure);
  }
  generator.popScope();
}

export function propertyDeclaration(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  {
    propertyName,
    typeName,
    description
  }: {
    propertyName: string;
    typeName: string;
    description: string;
  },
  closure?: () => void
) {
  comment(generator, description);
  generator.printOnNewline(`val ${propertyName}: ${typeName} =`);

  if (closure) {
    generator.withinBlock(closure);
  }
}

export function propertyDeclarations(
  generator: CodeGenerator<LegacyCompilerContext, any>,
  declarations: {
    propertyName: string;
    typeName: string;
    description: string;
  }[]
) {
  declarations.forEach(o => {
    propertyDeclaration(generator, o);
  });
}

const reservedKeywords = new Set([
  "case",
  "catch",
  "class",
  "def",
  "do",
  "else",
  "extends",
  "false",
  "final",
  "for",
  "if",
  "match",
  "new",
  "null",
  "throw",
  "trait",
  "true",
  "try",
  "until",
  "val",
  "var",
  "while",
  "with"
]);

export function escapeIdentifierIfNeeded(identifier: string) {
  if (reservedKeywords.has(identifier)) {
    return "`" + identifier + "`";
  } else {
    return identifier;
  }
}
