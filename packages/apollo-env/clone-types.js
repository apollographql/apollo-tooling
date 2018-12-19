/**
 * Goal
 * - recursively search the src/ dir for any *.d.ts files
 * - copy those d.ts files to the lib/ dir, while keeping the same folder
 *    structure found in src/
 */
const fs = require("fs");
const path = require("path");
const glob = require("glob");

// if the path to the file doesn't exist, we can't write the file
// this function just recursively creates the dir tree for the file to be written.
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

/*
 *  This function copies files ([string]) to the outputDir
 *  and preserves the path in the filename.
 *
 *  e.g. "test/a/b/hello.txt" would create directories "test", "a", and "b"
 *
 *  NOTE: outputDir isn't a _path_ to a directory. Just the name of a dir
 *    at the current level.
 */
copyFilesToDir = (files, outputDir) => {
  for (file of files) {
    // replace the src/ directory in the path with the outputDir
    const pathToWrite = path.join(outputDir, file.replace(/src./, ""));

    // if it's in a nested dir, we need to create the full path to the file
    // before creating the file
    makeNestedDir(path.dirname(pathToWrite));

    fs.copyFileSync(file, pathToWrite);
    console.log(`copied: ${file} -> ${pathToWrite}`);
  }
};

const files = glob
  .sync("./src/**/*.d.ts", {
    absolute: true // want path to file, not just filename
  })
  // remove the path to the current dir
  .map(file => file.replace(`${process.cwd()}/`, ""));

copyFilesToDir(files, "lib");
