/**
 * Custom Error Classes for NoteFlow
 *
 * Provides type-safe, semantic error handling instead of generic Error objects.
 * Each error class includes HTTP status code for automatic response mapping.
 *
 * @ai-prompt When throwing errors:
 * - Use specific error classes instead of `throw new Error()`
 * - Error names map to response codes in handleControllerError()
 * - Always include user-friendly messages
 *
 * @example
 * ```typescript
 * // ❌ BAD: Generic error
 * throw new Error('User not found')
 *
 * // ✅ GOOD: Semantic error
 * throw new NotFoundError('User not found')
 *
 * // Controller automatically maps to 404
 * ```
 */

/**
 * Base class for all custom errors
 */
export abstract class AppError extends Error {
  abstract readonly statusCode: number
  abstract readonly isOperational: boolean

  constructor(message: string) {
    super(message)
    this.name = this.constructor.name
    Error.captureStackTrace(this, this.constructor)
  }
}

/**
 * 400 Bad Request - Client sent invalid data
 *
 * @example
 * throw new BadRequestError('Invalid email format')
 * throw new BadRequestError('Missing required field: name')
 */
export class BadRequestError extends AppError {
  readonly statusCode = 400
  readonly isOperational = true

  constructor(message: string = 'Bad request') {
    super(message)
  }
}

/**
 * 401 Unauthorized - Authentication required or failed
 *
 * @example
 * throw new UnauthorizedError('Invalid credentials')
 * throw new UnauthorizedError('Token expired')
 */
export class UnauthorizedError extends AppError {
  readonly statusCode = 401
  readonly isOperational = true

  constructor(message: string = 'Unauthorized') {
    super(message)
  }
}

/**
 * 403 Forbidden - User authenticated but lacks permissions
 *
 * @example
 * throw new ForbiddenError('Admin access required')
 * throw new ForbiddenError('You do not have access to this resource')
 */
export class ForbiddenError extends AppError {
  readonly statusCode = 403
  readonly isOperational = true

  constructor(message: string = 'Forbidden') {
    super(message)
  }
}

/**
 * 404 Not Found - Resource does not exist
 *
 * @example
 * throw new NotFoundError('User not found')
 * throw new NotFoundError('Article not found')
 */
export class NotFoundError extends AppError {
  readonly statusCode = 404
  readonly isOperational = true

  constructor(message: string = 'Resource not found') {
    super(message)
  }
}

/**
 * 409 Conflict - Resource already exists
 *
 * @example
 * throw new ConflictError('Email already registered')
 * throw new ConflictError('Article already saved')
 */
export class ConflictError extends AppError {
  readonly statusCode = 409
  readonly isOperational = true

  constructor(message: string) {
    super(message)
  }
}

/**
 * 422 Unprocessable Entity - Validation failed
 *
 * @example
 * throw new ValidationError('Password must be at least 12 characters')
 * throw new ValidationError('Invalid date range')
 */
export class ValidationError extends AppError {
  readonly statusCode = 422
  readonly isOperational = true
  readonly details?: unknown

  constructor(message: string, details?: unknown) {
    super(message)
    this.details = details
  }
}

/**
 * 429 Too Many Requests - Rate limit exceeded
 *
 * @example
 * throw new RateLimitError('Too many login attempts. Try again in 15 minutes.')
 * throw new RateLimitError()
 */
export class RateLimitError extends AppError {
  readonly statusCode = 429
  readonly isOperational = true

  constructor(message: string = 'Too many requests. Please try again later.') {
    super(message)
  }
}

/**
 * Plan Limit Error - User exceeded their plan quota
 * Maps to 403 Forbidden with upgrade message
 *
 * @example
 * throw new PlanLimitError('Article save limit reached. Your FREE plan allows 10 saved articles.')
 */
export class PlanLimitError extends AppError {
  readonly statusCode = 403
  readonly isOperational = true

  constructor(message: string) {
    super(message)
  }
}

/**
 * 500 Internal Server Error - Unexpected error
 * Use sparingly - most errors should be specific
 *
 * @example
 * throw new InternalError('Database connection failed')
 */
export class InternalError extends AppError {
  readonly statusCode = 500
  readonly isOperational = false // Not expected - should be logged

  constructor(message: string = 'Internal server error') {
    super(message)
  }
}

/**
 * Type guard to check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}
