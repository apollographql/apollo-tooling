import { gitInfo } from "../git";

describe("Git integration", () => {
  it("Returns commit, branch, message, committer, and remoteUrl", async () => {
    // Currently these tests are too granular and would be better as
    // service:push tests when they are uncommented
    const info = await gitInfo(console.log);

    expect(info.commit).toBeDefined();
    expect(info.committer).toBeDefined();
    expect(info.remoteUrl).toBeDefined();
    // Match both ssh and http/s remotes
    expect(info.remoteUrl).toMatch(
      /(https?:\/\/|git@)github.com(\/|:)apollographql\/apollo-tooling(.git)?/
    );
    expect(info.message).toBeDefined();
    expect(info.branch).toBeDefined();
  });
});
