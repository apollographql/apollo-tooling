const baseConfig = require("../../jest.base");

module.exports = {
  ...baseConfig,
  setupFiles: ["apollo-env"]
};
