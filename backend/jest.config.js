export default {
  testEnvironment: 'node',
  transform: {},
  testMatch: ['**/src/**/*.test.js'],
  globalSetup: './src/tests/globalSetup.js',
  globalTeardown: './src/tests/globalTeardown.js',
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.test.js'],
  forceExit: true, // Exit cleanly after globalTeardown
};
