const baseConfig = require("../../jest.base");

module.exports = {
  ...baseConfig,
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    "snapshotSerializers"
  ]
};
