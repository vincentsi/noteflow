/**
 * Centralized Error Messages
 *
 * All user-facing error messages in one place for:
 * - Consistency across the app
 * - Easy translation/i18n in the future
 * - Maintainability
 */

export const ERROR_MESSAGES = {
  // Authentication errors
  AUTH: {
    INVALID_CREDENTIALS: 'Invalid email or password',
    REGISTRATION_FAILED: 'Registration failed. Please try again.',
    SESSION_EXPIRED: 'Your session has expired. Please login again.',
    UNAUTHORIZED: 'You must be logged in to access this page',
    EMAIL_ALREADY_EXISTS: 'An account with this email already exists',
    WEAK_PASSWORD: 'Password does not meet security requirements',
  },

  // Form validation errors
  FORM: {
    REQUIRED_FIELD: 'This field is required',
    INVALID_EMAIL: 'Please enter a valid email address',
    PASSWORD_MISMATCH: 'Passwords do not match',
    GENERIC_SUBMIT_ERROR: 'An error occurred. Please try again.',
  },

  // Profile errors
  PROFILE: {
    UPDATE_FAILED: 'Failed to update profile. Please try again.',
    LOAD_FAILED: 'Failed to load profile data',
  },

  // Stripe/Payment errors
  STRIPE: {
    CHECKOUT_FAILED: 'Failed to create checkout session. Please try again.',
    PORTAL_FAILED: 'Failed to open billing portal. Please try again.',
    SUBSCRIPTION_LOAD_FAILED: 'Failed to load subscription data',
    PAYMENT_FAILED: 'Payment processing failed. Please try again.',
  },

  // Network errors
  NETWORK: {
    TIMEOUT: 'Request timed out. Please check your connection.',
    OFFLINE: 'You are currently offline. Please check your internet connection.',
    SERVER_ERROR: 'Server error. Please try again later.',
  },

  // Generic errors
  GENERIC: {
    UNKNOWN: 'An unexpected error occurred. Please try again.',
    NOT_FOUND: 'The requested resource was not found',
    FORBIDDEN: 'You do not have permission to perform this action',
  },
} as const

/**
 * Success Messages
 */
export const SUCCESS_MESSAGES = {
  PROFILE: {
    UPDATED: 'Profile updated successfully',
  },
  AUTH: {
    LOGGED_IN: 'Welcome back!',
    REGISTERED: 'Account created successfully',
    PASSWORD_RESET_SENT: 'Password reset email sent. Please check your inbox.',
    PASSWORD_RESET_SUCCESS: 'Password reset successfully',
  },
  SUBSCRIPTION: {
    UPGRADED: 'Subscription upgraded successfully',
    CANCELED: 'Subscription canceled successfully',
  },
} as const
