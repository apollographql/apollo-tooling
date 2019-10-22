const baseConfig = require("../../jest.base");

module.exports = {
  ...baseConfig,
  setupFiles: ["apollo-env"],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    "snapshotSerializers"
  ]
};
