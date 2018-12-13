import { resolve } from "path";
import { spawnSync } from "child_process";

spawnSync(
  `node ${resolve(process.cwd(), "..", "..")}/node_modules/vscode/bin/test`,
  {
    stdio: "inherit",
    shell: true,
    env: {
      CODE_TESTS_PATH: `${process.cwd()}/lib/testRunner`,
      CODE_TESTS_WORKSPACE: "--disable-extensions"
    }
  }
);
