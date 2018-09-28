import { createHash } from "crypto";
import { ListrTask } from "listr";

import {
  loadQueryDocuments,
  extractOperationsAndFragments,
  combineOperationsAndFragments
} from "apollo-codegen-core/lib/loading";

import { DocumentNode } from "graphql";
import {
  hideLiterals,
  printWithReducedWhitespace,
  sortAST
} from "apollo-engine-reporting";

import { resolveDocumentSets } from "../../../config";

type ErrorLogger = (message: string) => void;

const taskResolveDocumentSets = (): ListrTask => ({
  title: "Resolving GraphQL document sets",
  task: async ctx => {
    ctx.documentSets = await resolveDocumentSets(ctx.config, false);
  }
});

const taskScanForOperations = ({ flags }: { flags: any }): ListrTask => ({
  title: "Scanning for GraphQL queries",
  task: async (ctx, task) => {
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
  task: async ctx => {
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
  task: async ctx => {
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

const taskNormalizeOperations = (): ListrTask => ({
  title: "Normalizing Operations",
  task: async ctx => {
    ctx.normalizedOperations = (ctx.fullOperations as Array<DocumentNode>).map(
      operation =>
        // While this could include dropping unused definitions, they are
        // kept because the registered operations should mirror those in the
        // client bundle minus any PPI. This provides more predictability
        // and allows a better understanding of where a query comes from.
        printWithReducedWhitespace(sortAST(hideLiterals(operation)))
    );
  }
});

const taskGenerateHashes = (): ListrTask => ({
  title: "Generating hashes",
  task: async ctx => {
    ctx.mapping = {};
    (ctx.normalizedOperations as Array<string>).forEach(operation => {
      ctx.mapping[
        createHash("sha512")
          .update(operation)
          .digest("base64")
      ] = operation;
    });
  }
});

export function getCommonManifestTasks(): ListrTask[] {
  return [taskNormalizeOperations(), taskGenerateHashes()];
}
