/**
 * Test Data Fixtures
 *
 * Centralized test data for E2E tests.
 * These users should be seeded in the database before running tests.
 */

export const TEST_USERS = {
  /**
   * Existing user with verified email
   * Used for: login, logout, protected routes tests
   */
  existing: {
    email: 'test@example.com',
    password: 'SecureTestPassE2E!@#',
    name: 'Test User',
  },

  /**
   * Free tier user (no subscription)
   * Used for: subscription tests, upgrade flow
   */
  free: {
    email: 'freeuser@example.com',
    password: 'SecureFreePassE2E!@#',
    name: 'Free User',
  },

  /**
   * PRO tier user (active subscription)
   * Used for: premium features tests
   */
  pro: {
    email: 'prouser@example.com',
    password: 'SecureProPassE2E!@#$',
    name: 'Pro User',
  },

  /**
   * STARTER tier user (active subscription)
   * Used for: starter features tests
   */
  starter: {
    email: 'starteruser@example.com',
    password: 'SecureStarterPassE2E!@#',
    name: 'Starter User',
  },

  /**
   * User with existing email (for duplicate registration tests)
   */
  duplicate: {
    email: 'existing@example.com',
    password: 'SecureExistPassE2E!',
    name: 'Existing User',
  },
} as const

/**
 * Test configuration
 */
export const TEST_CONFIG = {
  backend: {
    url: process.env.BACKEND_URL || 'http://localhost:3001',
    healthCheck: '/api/health',
  },
  frontend: {
    url: process.env.FRONTEND_URL || 'http://localhost:3000',
  },
  timeouts: {
    short: 5000, // 5s for quick operations
    medium: 10000, // 10s for API calls
    long: 30000, // 30s for complex flows
  },
} as const

/**
 * Get browser-specific timeouts
 * Firefox/WebKit are 2-3x slower than Chromium for rendering
 */
export const getBrowserTimeouts = (browserName: string) => ({
  short: browserName === 'chromium' ? 5000 : 10000,
  medium: browserName === 'chromium' ? 10000 : 20000,
  long: browserName === 'chromium' ? 30000 : 45000,
})

/**
 * Test routes
 */
export const TEST_ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  dashboard: '/dashboard',
  profile: '/profile',
  pricing: '/pricing',
  forgotPassword: '/forgot-password',
  resetPassword: '/reset-password',
  gdpr: '/settings/gdpr',
  veille: '/veille',
  powerpost: '/summaries',
  powernote: '/notes',
} as const
