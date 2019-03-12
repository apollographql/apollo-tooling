import fs from "fs";
import path from "path";
import Nock from "@fancy-test/nock";
import * as Test from "@oclif/test";
export { expect } from "@oclif/test";
import { mockConsole } from "heroku-cli-util";

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

const deleteFolderRecursive = path => {
  // don't relete files on azure CI
  if (process.env.AZURE_HTTP_USER_AGENT) return;

  if (fs.existsSync(path)) {
    fs.readdirSync(path).forEach(function(file, index) {
      var curPath = path + "/" + file;
      if (fs.lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(path);
  }
};

const makeNestedDir = dir => {
  if (fs.existsSync(dir)) return;

  try {
    fs.mkdirSync(dir);
  } catch (err) {
    if (err.code == "ENOENT") {
      makeNestedDir(path.dirname(dir)); //create parent dir
      makeNestedDir(dir); //create dir
    }
  }
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
        if (key.includes("/")) makeNestedDir(path.dirname(key));
        fs.writeFileSync(key, files[key]);
      });
    },
    finally(ctx: any) {
      process.chdir("../");
      deleteFolderRecursive(dir);
    }
  };
};

export const test = Test.test
  .register("nock", Nock)
  .register("fs", setupFS)
  .register("timing", time)
  .register("debug", debug);

// it would be great to have an .expectStdout(out => expection)

mockConsole();
