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

  function outputFile(format) {
    return "./lib/" + outputPrefix + "." + format + ".js";
  }

  const format = "umd";
  return [
    {
      input,
      output: {
        name: "apollo-language-server",
        file: outputFile(format),
        format,
        sourcemap: true
      },
      plugins: [
        // globals(),
        // nodeResolve({
        //   extensions: [".ts", ".tsx"],
        //   mainFields: ["main", "module"]
        // }),
        typescriptPlugin({ typescript, tsconfig }),
        commonjs({
          include: /node_modules/
        })
        // builtins(),
      ],
      onwarn(message) {
        const suppressed = ["UNRESOLVED_IMPORT", "THIS_IS_UNDEFINED"];

        if (!suppressed.find(code => message.code === code)) {
          return console.warn(message.message);
        }
      }
    }
  ];
}
