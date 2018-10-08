import { createHash } from "crypto";
import { ListrTask } from "listr";
import * as assert from "assert";

import {
  loadQueryDocuments,
  extractOperationsAndFragments,
  combineOperationsAndFragments
} from "apollo-codegen-core/lib/loading";

import { DocumentNode } from "graphql";
import {
  hideLiterals,
  printWithReducedWhitespace,
  sortAST,
  defaultSignature as engineDefaultSignature
} from "apollo-engine-reporting";

import { resolveDocumentSets } from "../../../config";

type ErrorLogger = (message: string) => void;

const taskResolveDocumentSets = (): ListrTask => ({
  title: "Resolving GraphQL document sets",
  task: async ctx => {
    // Make sure the expectations of our context are correct.
    assert.notStrictEqual(typeof ctx.config, "undefined");
    assert.strictEqual(typeof ctx.documentSets, "undefined");

    ctx.documentSets = await resolveDocumentSets(ctx.config, false);
  }
});

const taskScanForOperations = ({ flags }: { flags: any }): ListrTask => ({
  title: "Scanning for GraphQL queries",
  task: (ctx, task) => {
    // Make sure the expectations of our context are correct.
    assert.strictEqual(typeof ctx.queryDocuments, "undefined");

    ctx.queryDocuments = loadQueryDocuments(
      ctx.documentSets[0].documentPaths,
      flags.tagName
    );
    task.title = `Scanning for GraphQL queries (${
      ctx.queryDocuments.length
    } found)`;
  }
});

const taskIsolateOperationsAndFragments = ({
  errorLogger
}: {
  errorLogger?: ErrorLogger;
}): ListrTask => ({
  title: "Isolating operations and fragments",
  task: ctx => {
    // Make sure the expectations of our context are correct.
    assert.strictEqual(typeof ctx.fragments, "undefined");
    assert.strictEqual(typeof ctx.operations, "undefined");

    const { fragments, operations } = extractOperationsAndFragments(
      ctx.queryDocuments,
      errorLogger
    );
    ctx.fragments = fragments;
    ctx.operations = operations;
  }
});

const taskCombineOperationsAndFragments = ({
  errorLogger
}: {
  errorLogger?: ErrorLogger;
}): ListrTask => ({
  title: "Combining operations and fragments",
  task: ctx => {
    // Make sure the expectations of our context are correct.
    assert.strictEqual(typeof ctx.fullOperations, "undefined");

    ctx.fullOperations = combineOperationsAndFragments(
      ctx.operations,
      ctx.fragments,
      errorLogger
    );
  }
});

export function getCommonTasks({
  flags,
  errorLogger
}: {
  flags: any;
  errorLogger?: ErrorLogger;
}): ListrTask[] {
  return [
    taskResolveDocumentSets(),
    taskScanForOperations({ flags }),
    taskIsolateOperationsAndFragments({ errorLogger }),
    taskCombineOperationsAndFragments({ errorLogger })
  ];
}

/*
  Manifest related tasks
*/

const manifestOperationHash = (str: string): string =>
  createHash("sha256")
    .update(str)
    .digest("hex");

const engineSignature = (_TODO_operationAST: DocumentNode): string => {
  // TODO.  We don't currently have access to the operation name since it's
  // currently omitted by the `apollo-codegen-core` package logic.
  return engineDefaultSignature(_TODO_operationAST, "TODO");
};

interface OperationManifestRecord {
  signature: string;
  document: string;
  metadata: {
    engineSignature: string;
  };
}

const manifestRecordForOperation = (
  operationAST: DocumentNode
): OperationManifestRecord => {
  // While this could include dropping unused definitions, they are
  // kept because the registered operations should mirror those in the
  // client bundle minus any PII which lives within string literals.
  const document = printWithReducedWhitespace(
    sortAST(hideLiterals(operationAST))
  );

  return {
    signature: manifestOperationHash(document),
    document,
    metadata: {
      engineSignature: engineSignature(operationAST)
    }
  };
};

const taskGenerateManifest = (): ListrTask => ({
  title: "Generating manifest",
  task: ctx => {
    // Make sure the expectations of our context are correct.
    assert.strictEqual(Array.isArray(ctx.fullOperations), true);
    assert.strictEqual(typeof ctx.manifest, "undefined");

    const operations = (ctx.fullOperations as Array<DocumentNode>).map(
      operationAST => manifestRecordForOperation(operationAST)
    );

    // Set the manifest into a known location on the context.
    ctx.manifest = {
      version: 1,
      operations
    };
  }
});

export function getCommonManifestTasks(): ListrTask[] {
  return [taskGenerateManifest()];
}
