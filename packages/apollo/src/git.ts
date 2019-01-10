import * as path from "path";
import * as fs from "fs";
import * as ci from "env-ci";
import { gitToJs } from "git-parse";
import * as git from "git-rev-sync";
import { pickBy, identity } from "lodash";

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

export const gitInfo = async (): Promise<GitContext | undefined> => {
  // Occasionally `branch` will be undefined depending on the environment, so
  // we need to fallback on `prBranch`. However in some cases, we are not able
  // to get to the branch at all. For more information, see
  // https://github.com/pvdlg/env-ci#caveats
  //
  // slug is formatted as follows: ${organization}/${repository name}
  const { isCi, commit, branch: ciBranch, slug, root, prBranch } = ci();
  const gitLoc = root ? root : findGitRoot();

  if (!commit) return;

  let committer;
  let branch = ciBranch || prBranch;
  let remoteUrl = slug;
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

    if (!isCi) {
      try {
        remoteUrl = git.remoteUrl();
      } catch (e) {}
    }

    // The ci and pr branches pulled from the ci's environment can be undefined,
    // so we fallback on the git context.
    //
    // See https://github.com/pvdlg/env-ci#caveats for a detailed list of when
    // branch can be undefined
    if (!branch) {
      branch = git.branch();
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
