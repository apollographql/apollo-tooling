import { GraphQLClientProject } from "apollo-language-server";
import {
  defaultOperationRegistrySignature,
  operationHash
} from "apollo-graphql";

export interface ManifestEntry {
  signature: string;
  document: string;
  metadata: {
    engineSignature: string;
  };
}

export function getOperationManifestFromProject(
  project: GraphQLClientProject,
  options: { stripLiterals: boolean } = { stripLiterals: true }
): ManifestEntry[] {
  const manifest = Object.entries(
    project.mergedOperationsAndFragmentsForService
  ).map(([operationName, operationAST]) => {
    const printed = defaultOperationRegistrySignature(
      operationAST,
      operationName,
      { stripLiterals: options.stripLiterals }
    );

    return {
      signature: operationHash(printed),
      document: printed,
      // TODO: unused. Remove or repurpose this field altogether with op. registry 2.0 work.
      // For now, this field is non-nullable on the input type.
      metadata: {
        engineSignature: ""
      }
    };
  });

  return manifest;
}
