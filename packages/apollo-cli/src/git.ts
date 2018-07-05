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

export const gitInfo = async (path?: string) => {
  const { isCi, commit, slug, root } = ci();
  const gitLoc = root ? root : findGitRoot();

  console.log({ commit });
  if (!commit) return;

  let committer;
  let remoteUrl = slug;
  if (gitLoc) {
    const { authorName, authorEmail } = await gitToJs(gitLoc)
      .then(
        (commits: Commit[]) =>
          commits && commits.length > 0
            ? commits[0]
            : { authorName: null, authorEmail: null }
      )
      .catch(() => ({ authorEmail: null, authorName: null }));

    committer = `${authorName || ""} ${
      authorEmail ? `<${authorEmail}>` : ""
    }`.trim();

    if (!isCi) {
      try {
        remoteUrl = git.remoteUrl();
      } catch (e) {}
    }
  }

  return pickBy({ committer, commit, remoteUrl }, identity);
};
