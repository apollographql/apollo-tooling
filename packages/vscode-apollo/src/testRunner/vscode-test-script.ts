import { resolve } from "path";
import { spawnSync } from "child_process";

spawnSync(
  `node ${resolve(process.cwd(), "..", "..")}/node_modules/vscode/bin/test`,
  {
    stdio: "inherit",
    shell: true,
    env: {
      CODE_TESTS_PATH: `${process.cwd()}/lib/testRunner`,
      // Note:
      // Extensions that boot up and throw warnings on the host machine will cause tests to fail,
      // so running with --disable-extensions is a must. This env variable in particular is open
      // to injection in this manner, so I did it with a sad face.
      CODE_TESTS_WORKSPACE: "--disable-extensions"
    }
  }
);
