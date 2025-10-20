/**
 * Standardized API Response Builders
 *
 * These builders ensure consistency across all API responses.
 * Avoids code duplication and guarantees a uniform format.
 *
 * @example
 * ```typescript
 * import { ErrorResponse, SuccessResponse } from '@/utils/response-builders'
 *
 * // Success
 * return reply.status(200).send(SuccessResponse.ok({ user }))
 *
 * // Error
 * return reply.status(409).send(ErrorResponse.conflict('Email already exists'))
 * ```
 */

/**
 * Error Response Builders
 * All standard HTTP error codes
 */
export const ErrorResponse = {
  /**
   * 400 Bad Request - Invalid request
   */
  badRequest: (message: string, details?: unknown) => {
    const response: { success: false; error: string; details?: unknown } = {
      success: false,
      error: message,
    }
    if (details) {
      response.details = details
    }
    return response
  },

  /**
   * 401 Unauthorized - Not authenticated
   */
  unauthorized: (message = 'Unauthorized') => ({
    success: false,
    error: message,
  }),

  /**
   * 403 Forbidden - Authenticated but not authorized
   */
  forbidden: (message = 'Forbidden') => ({
    success: false,
    error: message,
  }),

  /**
   * 404 Not Found - Resource not found
   */
  notFound: (message = 'Resource not found') => ({
    success: false,
    error: message,
  }),

  /**
   * 409 Conflict - Conflict (e.g. email already used)
   */
  conflict: (message: string) => ({
    success: false,
    error: message,
  }),

  /**
   * 422 Unprocessable Entity - Validation error
   */
  validationError: (message: string, details?: unknown) => {
    const response: { success: false; error: string; details?: unknown } = {
      success: false,
      error: message,
    }
    if (details) {
      response.details = details
    }
    return response
  },

  /**
   * 429 Too Many Requests - Rate limit exceeded
   */
  tooManyRequests: (message = 'Too many requests. Please try again later.') => ({
    success: false,
    error: message,
  }),

  /**
   * 500 Internal Server Error - Server error
   */
  internalError: (message = 'Internal server error') => ({
    success: false,
    error: message,
  }),
} as const

/**
 * Success Response Builders
 * All standard HTTP success codes
 */
export const SuccessResponse = {
  /**
   * 200 OK - Success with data
   */
  ok: <T>(data: T) => ({
    success: true,
    data,
  }),

  /**
   * 201 Created - Resource created successfully
   */
  created: <T>(data: T) => ({
    success: true,
    data,
  }),

  /**
   * 200 OK - Success with simple message (no data)
   */
  message: (message: string) => ({
    success: true,
    message,
  }),

  /**
   * 204 No Content - Success without content (e.g. delete)
   * Note: Fastify automatically sends 204 if reply.send() is empty
   */
  noContent: () => ({}),
} as const

/**
 * Type-safe response types
 */
export type ErrorResponseType = ReturnType<
  (typeof ErrorResponse)[keyof typeof ErrorResponse]
>
export type SuccessResponseType<T = unknown> = ReturnType<
  (typeof SuccessResponse)['ok' | 'created']
> & { data?: T }
