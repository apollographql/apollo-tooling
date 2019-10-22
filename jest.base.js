module.exports = {
  preset: "ts-jest",
  testPathIgnorePatterns: ["node_modules", "lib", "__fixtures__", "__mocks__"],
  testEnvironment: "node",
  globals: {
    "ts-jest": {
      tsConfig: "<rootDir>/tsconfig.test.json",
      diagnostics: false
    }
  }
};
