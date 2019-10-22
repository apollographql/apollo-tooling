const baseConfig = require("../../jest.base");

module.exports = {
  ...baseConfig,
  setupFiles: ["apollo-env"],
  setupFilesAfterEnv: ["<rootDir>/test-utils/matchers.ts"],
  testPathIgnorePatterns: [
    ...baseConfig.testPathIgnorePatterns,
    "<rootDir>/src/compiler/visitors/__tests__/test-utils/"
  ]
};
