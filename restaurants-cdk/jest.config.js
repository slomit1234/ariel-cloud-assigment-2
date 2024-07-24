module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.test.ts', '**/slomitas-test/**/*.tests.js'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  }
};
