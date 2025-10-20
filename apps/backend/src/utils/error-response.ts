import type { FastifyRequest, FastifyReply } from 'fastify'
import { ZodError } from 'zod'

/**
 * Custom error handler map
 * Maps error messages to custom response handlers
 */
export type CustomErrorHandlers = Record<
  string,
  (error: Error, reply: FastifyReply, request: FastifyRequest) => FastifyReply | Promise<FastifyReply>
>

/**
 * Centralized error response handler for controllers
 * Reduces duplication across all controller methods
 *
 * Handles common error patterns:
 * - ZodError: Validation errors (400)
 * - Custom error messages via handlers map (configurable status codes)
 * - Unknown errors: Generic 500 response
 *
 * @param error - The error object caught in try-catch
 * @param request - Fastify request (for logging)
 * @param reply - Fastify reply (for sending response)
 * @param customHandlers - Optional map of error message → custom handler
 *
 * @example
 * ```typescript
 * // In auth.controller.ts register()
 * catch (error) {
 *   return handleControllerError(error, request, reply, {
 *     'Email already in use': (err, reply, req) => {
 *       // Log without email for GDPR compliance (only IP address)
 *       req.log.warn({ ip: req.ip }, 'Registration failed')
 *       return reply.status(409).send({
 *         success: false,
 *         error: err.message
 *       })
 *     }
 *   })
 * }
 * ```
 *
 * @example
 * ```typescript
 * // In auth.controller.ts login()
 * catch (error) {
 *   return handleControllerError(error, request, reply, {
 *     'Invalid credentials': (err, reply, req) => {
 *       // Log without email for GDPR compliance (only IP address)
 *       req.log.warn({ ip: req.ip }, 'Failed login attempt')
 *       return reply.status(401).send({ success: false, error: err.message })
 *     },
 *     'Account has been deleted': (err, reply, req) => {
 *       // Log without email for GDPR compliance (only IP address)
 *       req.log.warn({ ip: req.ip }, 'Login attempt for deleted account')
 *       return reply.status(403).send({ success: false, error: err.message })
 *     }
 *   })
 * }
 * ```
 */
export function handleControllerError(
  error: unknown,
  request: FastifyRequest,
  reply: FastifyReply,
  customHandlers?: CustomErrorHandlers
): FastifyReply | Promise<FastifyReply> {
  // Handle Error instances
  if (error instanceof Error) {
    // Check custom handlers first
    const handler = customHandlers?.[error.message]
    if (handler) {
      return handler(error, reply, request)
    }

    // Handle Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: error.issues,
      }) as FastifyReply
    }

    // Check by error.name for ZodError (in case instanceof fails)
    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: 'Validation error',
        details: error,
      }) as FastifyReply
    }
  }

  // Log unknown errors (sanitized to prevent stack trace exposure in production)
  if (error instanceof Error) {
    // In production, only log error name and message (no stack trace)
    const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test'

    if (isDevelopment) {
      // Full error details in development (including stack)
      request.log.error(error)
    } else {
      // Sanitized error in production (no stack trace)
      request.log.error({
        name: error.name,
        message: error.message,
      }, 'Internal server error')
    }
  } else {
    // Unknown error type
    request.log.error({ errorType: typeof error }, 'Unknown error type')
  }

  // Generic 500 response
  return reply.status(500).send({
    success: false,
    error: 'Internal server error',
  }) as FastifyReply
}
