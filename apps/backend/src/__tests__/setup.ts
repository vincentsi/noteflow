/// <reference types="jest" />

/**
 * Jest Setup File
 * Runs before all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:0771@localhost:5432/noteflow_test'
process.env.JWT_SECRET = 'test-jwt-secret-min-32-chars-required-for-testing-purposes'
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-min-32-chars-required-for-testing'
process.env.PORT = '3002'

// Mock Sentry in tests (we don't want to send errors to Sentry during tests)
jest.mock('@/config/sentry', () => ({
  initializeSentry: jest.fn(),
  captureException: jest.fn(),
  setUserContext: jest.fn(),
  clearUserContext: jest.fn(),
  addBreadcrumb: jest.fn(),
  startTransaction: jest.fn(() => ({
    setStatus: jest.fn(),
    finish: jest.fn(),
  })),
}))

// Mock Redis in tests (optional, can be real Redis or mocked)
jest.mock('@/config/redis', () => ({
  initializeRedis: jest.fn(),
  disconnectRedis: jest.fn(),
  getRedis: jest.fn(() => null),
  isRedisAvailable: jest.fn(() => false),
}))

// Increase timeout for slow tests
jest.setTimeout(10000)
