import { gitInfo } from "../git";

describe("Git integration", () => {
  it("Returns commit, branch, message, committer, and remoteUrl", async () => {
    // Currently these tests are too granular and would be better as
    // service:push tests when they are uncommented
    const info = await gitInfo();

    expect(info.commit).toBeDefined();
    expect(info.committer).toBeDefined();
    expect(info.remoteUrl).toBeDefined();
    expect(info.message).toBeDefined();
    expect(info.branch).toBeDefined();
  });
});
