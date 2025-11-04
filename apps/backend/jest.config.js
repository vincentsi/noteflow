/* eslint-env node */
/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Mock isomorphic-dompurify to avoid ESM issues in tests
    '^@/utils/sanitize$': '<rootDir>/src/__tests__/__mocks__/sanitize.mock.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/services/**/*.{ts,tsx}',
    'src/utils/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    // Exclude backup service from coverage (no tests, disabled in dev)
    '!src/services/backup.service.ts',
    '!src/services/cleanup.service.ts',
    '!src/services/rss-cleanup.service.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 35,
      functions: 35,
      lines: 45,
      statements: 45,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testTimeout: 10000,
  // Run tests sequentially to avoid DB race conditions in integration tests
  maxWorkers: 1,
}
