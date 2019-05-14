import path from "path";
import fs from "fs";
import ci from "env-ci";
import { gitToJs } from "git-parse";
import git from "git-rev-sync";
import pickBy from "lodash.pickby";
import identity from "lodash.identity";
import Command from "@oclif/command";

const findGitRoot = (start?: string | string[]): string | void => {
  start = start || process.cwd();
  if (typeof start === "string") {
    if (start[start.length - 1] !== path.sep) start += path.sep;
    start = start.split(path.sep);
  }
  if (!start.length) return;
  start.pop();
  const dir = start.join(path.sep);
  if (fs.existsSync(path.join(dir, ".git"))) {
    return path.normalize(dir);
  } else {
    return findGitRoot(start);
  }
};

export interface Commit {
  authorName: string | null;
  authorEmail: string | null;
}

export interface GitContext {
  committer?: string;
  commit: string;
  message?: string;
  remoteUrl?: string;
  branch?: string;
}

export const gitInfo = async (
  log: Command["log"]
): Promise<GitContext | undefined> => {
  // Occasionally `branch` will be undefined depending on the environment, so
  // we need to fallback on `prBranch`. However in some cases, we are not able
  // to get to the branch at all. For more information, see
  // https://github.com/pvdlg/env-ci#caveats
  const { commit, branch: ciBranch, root, prBranch } = ci();
  const gitLoc = root ? root : findGitRoot();

  if (!commit) return;

  let committer;
  let branch = ciBranch || prBranch;
  // BUILD_REPOSITORY_ID is for azure pipelines
  let remoteUrl = process.env.BUILD_REPOSITORY_ID;
  let message;

  // In order to use git-parse and git-rev-sync, we must ensure that a git context is
  // accessible. Without this check, the commands would throw
  if (gitLoc) {
    const { authorName, authorEmail, ...commit } = await gitToJs(gitLoc)
      .then((commits: Commit[]) =>
        commits && commits.length > 0
          ? commits[0]
          : { authorName: null, authorEmail: null, message: null }
      )
      .catch(() => ({ authorEmail: null, authorName: null, message: null }));

    committer = `${authorName || ""} ${
      authorEmail ? `<${authorEmail}>` : ""
    }`.trim();

    message = commit.message;

    // The remoteUrl call can fail and throw an error
    // https://github.com/kurttheviking/git-rev-sync-js#gitremoteurl--string
    try {
      remoteUrl = git.remoteUrl();
    } catch (e) {
      log(["Unable to retrieve remote url, failed with:", e].join("\n\n"));
    }

    // The ci and pr branches pulled from the ci's environment can be undefined,
    // so we fallback on the git context.
    //
    // See https://github.com/pvdlg/env-ci#caveats for a detailed list of when
    // branch can be undefined
    if (!branch) {
      branch = git.branch([gitLoc]);
    }
  }

  return pickBy(
    {
      committer,
      commit,
      remoteUrl,
      message,
      branch
    },
    identity
  ) as GitContext;
};
