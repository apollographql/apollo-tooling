import json from "rollup-plugin-json";
import nodeResolve from "rollup-plugin-node-resolve";
import typescriptPlugin from "rollup-plugin-typescript2";
import commonjs from "rollup-plugin-commonjs";
import builtins from "rollup-plugin-node-builtins";
import globals from "rollup-plugin-node-globals";
import typescript from "typescript";
import path from "path";

const defaultGlobals = {
  tslib: "tslib"
};

export function rollup({
  input = "./src/index.ts",
  outputPrefix = "bundle"
} = {}) {
  const projectDir = path.join(__filename, "..");
  console.info(`Building project esm ${projectDir}`);
  const tsconfig = `${projectDir}/tsconfig.json`;
  const external = Object.keys(
    require(`${projectDir}/package.json`).dependencies
  );

  function outputFile(format) {
    return "./lib/" + outputPrefix + "." + format + ".js";
  }

  const format = "iife";
  return [
    {
      external,
      input,
      output: {
        name: "apolloLanguageServer",
        file: outputFile(format),
        format,
        sourcemap: true
      },
      plugins: [
        globals(),

        // This can't be used right now because we're using `existsSync`, which
        // is not included in the browserify-fs stub provider in level-filesystem.
        // Realistically, that's likely a problem, so that should probably be
        // switched, or that code-path avoided.
        //
        // builtins({
        //   fs: true,
        // }),

        nodeResolve({
          extensions: [".ts", ".tsx", ".js"]
          // mainFields: ["browser", "main"]
        }),

        typescriptPlugin({ typescript, tsconfig }),

        commonjs({
          include: /node_modules/
        })
      ]
    }
  ];
}
