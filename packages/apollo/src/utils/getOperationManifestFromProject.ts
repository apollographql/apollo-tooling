import { GraphQLClientProject } from "apollo-language-server";
import { operationHash, operationRegistrySignature } from "apollo-graphql";

export interface ManifestEntry {
  signature: string;
  document: string;
  metadata: {
    engineSignature: string;
  };
}

export function getOperationManifestFromProject(
  project: GraphQLClientProject,
  options: { preserveStringAndNumericLiterals: boolean } = {
    preserveStringAndNumericLiterals: false,
  }
): ManifestEntry[] {
  const manifest = Object.entries(
    project.mergedOperationsAndFragmentsForService
  ).map(([operationName, operationAST]) => {
    const printed = operationRegistrySignature(operationAST, operationName, {
      preserveStringAndNumericLiterals:
        options.preserveStringAndNumericLiterals,
    });

    return {
      signature: operationHash(printed),
      document: printed,
      // TODO: unused. Remove or repurpose this field altogether with op. registry 2.0 work.
      // For now, this field is non-nullable on the input type.
      metadata: {
        engineSignature: "",
      },
    };
  });

  return manifest;
}
