module.exports = {
  preset: 'jest-expo',
  // Beijing, UTC+8: local and UTC days differ for eight hours of every day,
  // which is exactly where day-boundary bugs live.
  globalSetup: '<rootDir>/test/globalSetup.js',
  setupFiles: ['<rootDir>/test/setup.js'],
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.js'],
};
