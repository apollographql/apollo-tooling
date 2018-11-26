import * as fs from "fs";
import Nock from "@fancy-test/nock";
import * as Test from "@oclif/test";
export { expect } from "@oclif/test";
import { mockConsole } from "heroku-cli-util";
// import { userInfo } from "os";
// import { vol } from "memfs";
// import { ufs } from "unionfs";

const time = label => {
  let start = +new Date();

  return {
    async run() {},
    finally() {
      console.log(`${label || "TIME"}:`, +new Date() - start, "ms");
    }
  };
};

const debug = fn => {
  return {
    async run() {
      fn();
    },
    finally() {}
  };
};

const setupFS = (files: Record<string, string>) => {
  let dir;
  return {
    async run(ctx: any, ...rest) {
      // make a random remp dir & chdir into it
      dir = fs.mkdtempSync("__tmp__");
      process.chdir(dir);
      // fill the dir with `files`
      Object.keys(files).forEach(key => {
        fs.writeFileSync(key, files[key]);
      });
    },
    finally(ctx: any) {
      const postFiles = fs.readdirSync("./");
      // delele all files
      postFiles.forEach(key => {
        fs.unlinkSync(key);
      });
      // go up one level & delete the temp dir
      process.chdir("../");
      fs.rmdirSync(dir);
    }
  };
};

export const test = Test.test
  .register("nock", Nock)
  .register("fs", setupFS)
  .register("timing", time)
  .register("debug", debug);

mockConsole();
