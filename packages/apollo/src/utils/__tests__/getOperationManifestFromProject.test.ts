import { getOperationManifestFromProject } from "../getOperationManifestFromProject";
import { GraphQLClientProject } from "apollo-language-server";

const mergedOperationsAndFragmentsForService = require("./fixtures/mockOperations.json");

describe("getOperationManifestFromProject", () => {
  const mockProject = {
    mergedOperationsAndFragmentsForService,
  } as GraphQLClientProject;

  it("builds an operation manifest", () => {
    // XXX
    // This is mostly a sanity check, and should prevent someone from unintentionally changing the way
    // that operations are normalized.
    expect(getOperationManifestFromProject(mockProject)).toMatchSnapshot();
  });
});
