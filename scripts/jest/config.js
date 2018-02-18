'use strict';

module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|js)x?$': 'ts-jest'
  },
  testMatch: ['**/__tests__/*.(js|ts)'],
  moduleFileExtensions: ['ts', 'js'],
  moduleNameMapper: {
    '^apollo-codegen-(.*)$': '<rootDir>/../apollo-codegen-$1/src'
  },
  testPathIgnorePatterns: ['/node_modules/, /lib/'],
  setupTestFrameworkScriptFile: __dirname + '/matchers.ts',
  globals: {
    'ts-jest': {
      tsConfigFile: 'tsconfig.test.json',
      skipBabel: true
    }
  }
};
