import { dirname } from "path";
import {
  mkdirSync,
  existsSync,
  readdirSync,
  lstatSync,
  unlinkSync,
  rmdirSync
} from "fs";

export const deleteFolderRecursive = path => {
  // don't relete files on azure CI
  if (process.env.AZURE_HTTP_USER_AGENT) return;

  if (existsSync(path)) {
    readdirSync(path).forEach(function(file, index) {
      var curPath = path + "/" + file;
      if (lstatSync(curPath).isDirectory()) {
        // recurse
        deleteFolderRecursive(curPath);
      } else {
        // delete file
        unlinkSync(curPath);
      }
    });
    rmdirSync(path);
  }
};

export const makeNestedDir = dir => {
  if (existsSync(dir)) return;

  try {
    mkdirSync(dir);
  } catch (err) {
    if (err.code == "ENOENT") {
      makeNestedDir(dirname(dir)); //create parent dir
      makeNestedDir(dir); //create dir
    }
  }
};
