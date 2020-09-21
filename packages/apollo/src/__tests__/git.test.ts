import { gitInfo, sanitizeGitRemote } from "../git";

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

describe("strip usernames/passwords from git remotes", () => {
  it("returns empty for unknown remotes", () => {
    let clean = sanitizeGitRemote(
      "https://un@sourceforge.net/apollographql/test"
    );
    expect(clean).toBeNull();
  });
  it("removes username from remote with only a username present", () => {
    let clean = sanitizeGitRemote(
      "https://un@bitbucket.org/apollographql/test"
    );
    expect(clean).toEqual("https://REDACTED@bitbucket.org/apollographql/test");
  });
  it("does not mind case", () => {
    let clean = sanitizeGitRemote("https://un@GITHUB.com/apollographql/test");
    expect(clean).toEqual("https://REDACTED@GITHUB.com/apollographql/test");
  });
  it("strips usernames from ssh urls", () => {
    let clean = sanitizeGitRemote("ssh://un%401@github.com/apollographql/test");
    expect(clean).toEqual("REDACTED@github.com:apollographql/test");
  });
  it("works properly with (allowed) special characters in username/password", () => {
    let clean = sanitizeGitRemote(
      "https://un:p%40ssw%3Ard@github.com/apollographql/test"
    );
    expect(clean).toEqual("https://REDACTED@github.com/apollographql/test");

    let bbClean = sanitizeGitRemote(
      "https://un:p%40ssw%3Ard@bitbucket.org/apollographql/test"
    );
    expect(bbClean).toEqual(
      "https://REDACTED@bitbucket.org/apollographql/test"
    );

    let glClean = sanitizeGitRemote(
      "https://un:p%40ssw%3Ard@gitlab.com/apollographql/test"
    );
    expect(glClean).toEqual("https://REDACTED@gitlab.com/apollographql/test");
  });
  it("works with non-url remotes from github with git user ONLY", () => {
    let clean = sanitizeGitRemote(
      "git@github.com:apollographql/apollo-tooling.git"
    );
    expect(clean).toEqual("git@github.com:apollographql/apollo-tooling.git");

    let clean2 = sanitizeGitRemote(
      "bob@github.com:apollographql/apollo-tooling.git"
    );
    expect(clean2).toEqual(
      "REDACTED@github.com:apollographql/apollo-tooling.git"
    );
  });
  it("works with non-url remotes from bitbucket with git user ONLY", () => {
    let clean = sanitizeGitRemote(
      "git@bitbucket.org:apollographql/apollo-tooling.git"
    );
    expect(clean).toEqual("git@bitbucket.org:apollographql/apollo-tooling.git");

    let clean2 = sanitizeGitRemote(
      "bob@bitbucket.org:apollographql/apollo-tooling.git"
    );
    expect(clean2).toEqual(
      "REDACTED@bitbucket.org:apollographql/apollo-tooling.git"
    );
  });
  it("works with non-url remotes from gitlab with git user ONLY", () => {
    let clean = sanitizeGitRemote(
      "git@gitlab.com:apollographql/apollo-tooling.git"
    );
    expect(clean).toEqual("git@gitlab.com:apollographql/apollo-tooling.git");

    let clean2 = sanitizeGitRemote(
      "bob@gitlab.com:apollographql/apollo-tooling.git"
    );
    expect(clean2).toEqual(
      "REDACTED@gitlab.com:apollographql/apollo-tooling.git"
    );
  });
  it("does not allow non-url remotes from unrecognized providers (not github)", () => {
    let clean = sanitizeGitRemote(
      "git@lab.com:apollographql/apollo-tooling.git"
    );
    expect(clean).toBeNull();
  });
  // TODO maybe fix this in the future?
  // git-url-parse right now just uses the dirty `href` if the protocol is unknow
  // https://github.com/IonicaBizau/git-url-parse/blob/master/lib/index.js#L216-L217
  it("returns null with unknown protocols", () => {
    let clean = sanitizeGitRemote(
      "git+http://un:p%40sswrd@github.com/apollographql/test"
    );
    expect(clean).toBeNull();
  });
});
