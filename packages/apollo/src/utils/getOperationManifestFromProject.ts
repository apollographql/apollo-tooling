import { createHash } from "crypto";
import { defaultEngineReportingSignature } from "apollo-graphql";
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
    const printed = defaultEngineReportingSignature(operationAST, "");

    return {
      signature: manifestOperationHash(printed),
      document: printed,
      metadata: {
        engineSignature: printed
      }
    };
  });

  return manifest;
}

function manifestOperationHash(str: string): string {
  return createHash("sha256")
    .update(str)
    .digest("hex");
}
