import { createHash } from "crypto";
import {
  DocumentNode,
  FloatValueNode,
  IntValueNode,
  StringValueNode,
  visit
} from "graphql";
import {
  defaultSignature,
  printWithReducedWhitespace,
  sortAST
} from "apollo-engine-reporting";
import { GraphQLClientProject } from "apollo-language-server";

export interface ManifestEntry {
  signature: string;
  document: string;
  metadata: {
    engineSignature: string;
  };
}

export function getOperationManifestFromProject(
  project: GraphQLClientProject
): ManifestEntry[] {
  const manifest = Object.values(
    project.mergedOperationsAndFragmentsForService
  ).map(operationAST => {
    // While this could include dropping unused definitions, they are
    // kept because the registered operations should mirror those in the
    // client bundle minus any PII which lives within string literals.
    const printed = printWithReducedWhitespace(
      sortAST(hideCertainLiterals(operationAST))
    );

    return {
      signature: manifestOperationHash(printed),
      document: printed,
      metadata: {
        engineSignature: engineSignature(operationAST)
      }
    };
  });

  return manifest;
}

// In the same spirit as the similarly named `hideLiterals` function from the
// `apollo-engine-reporting/src/signature.ts` module, we'll do an AST visit
// to redact literals.  Developers are strongly encouraged to use the
// `variables` aspect of the which would avoid these being explicitly
// present in the operation manifest at all.  The primary area of concern here
// is to avoid sending in-lined literals which might contain sensitive
// information (e.g. API keys, etc.).
function hideCertainLiterals(ast: DocumentNode): DocumentNode {
  return visit(ast, {
    IntValue(node: IntValueNode): IntValueNode {
      return { ...node, value: "0" };
    },
    FloatValue(node: FloatValueNode): FloatValueNode {
      return { ...node, value: "0" };
    },
    StringValue(node: StringValueNode): StringValueNode {
      return { ...node, value: "", block: false };
    }
  });
}

function manifestOperationHash(str: string): string {
  return createHash("sha256")
    .update(str)
    .digest("hex");
}

function engineSignature(_TODO_operationAST: DocumentNode): string {
  // TODO.  We don't currently have access to the operation name since it's
  // currently omitted by the `apollo-codegen-core` package logic.
  return defaultSignature(_TODO_operationAST, "TODO");
}
