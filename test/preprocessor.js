const tsc = require('typescript');
const tsConfig = require('../tsconfig.json');

module.exports = {
  process(src, path) {
    return tsc.transpile(src, tsConfig.compilerOptions, path, []);
  }
};
