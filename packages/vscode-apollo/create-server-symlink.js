const symlinkDir = require("symlink-dir");

symlinkDir("../../apollo-language-server", "./node_modules/").then(result => {
  console.log(result);
});
