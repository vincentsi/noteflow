import { FastifyRequest, FastifyReply } from 'fastify'
import { randomUUID } from 'crypto'

/**
 * Correlation ID Middleware
 *
 * Adds a unique correlation ID to each request for distributed tracing and debugging.
 * The correlation ID is:
 * - Generated if not present in request headers
 * - Added to response headers for client-side correlation
 * - Available in request context for logging
 *
 * Benefits:
 * - Track requests across multiple services
 * - Correlate logs from frontend and backend
 * - Debug issues by following the request flow
 * - Support for APM tools (Datadog, New Relic, Sentry)
 *
 * @usage
 * ```typescript
 * // In app.ts
 * app.register(correlationIdMiddleware)
 *
 * // In any route/middleware
 * const correlationId = request.headers['x-correlation-id']
 * logger.info({ correlationId }, 'Processing request')
 * ```
 */

/**
 * Register correlation ID middleware
 * Adds X-Correlation-ID header to all requests and responses
 */
export async function correlationIdMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Get existing correlation ID from request or generate new one
  const correlationId =
    (request.headers['x-correlation-id'] as string) ||
    (request.headers['x-request-id'] as string) ||
    randomUUID()

  // Store in request for access in routes/services
  request.headers['x-correlation-id'] = correlationId

  // Add to response headers for client-side correlation
  reply.header('X-Correlation-ID', correlationId)

  // Add to Fastify request context (accessible in logs via request.id)
  // Fastify already generates request.id, but we override with our correlation ID
  // This ensures consistency across all logs
  request.id = correlationId
}

/**
 * Decorate FastifyRequest with correlation ID type
 */
declare module 'fastify' {
  interface FastifyRequest {
    correlationId?: string
  }
}
