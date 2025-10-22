import { FastifyRequest, FastifyReply } from 'fastify'

/**
 * API Versioning Middleware
 *
 * Adds API version headers to all responses for client compatibility tracking.
 * Supports deprecation warnings for older API versions.
 *
 * Current API Version: 1.0
 *
 * Headers:
 * - X-API-Version: Current API version (e.g., "1.0")
 * - X-API-Deprecated: Set to "true" if endpoint is deprecated
 * - X-API-Sunset: ISO 8601 date when deprecated endpoint will be removed
 * - X-API-Latest-Version: Latest available API version
 *
 * @example
 * ```typescript
 * // Client checks version compatibility
 * const response = await fetch('/api/users')
 * const apiVersion = response.headers.get('X-API-Version')
 * const isDeprecated = response.headers.get('X-API-Deprecated') === 'true'
 *
 * if (isDeprecated) {
 *   console.warn('Using deprecated API version. Please upgrade.')
 * }
 * ```
 */

/**
 * Current API version
 * Increment when making breaking changes
 */
export const CURRENT_API_VERSION = '1.0'

/**
 * Latest API version (same as current for now)
 * Will differ when multiple versions are supported
 */
export const LATEST_API_VERSION = '1.0'

/**
 * Deprecated endpoints configuration
 * Add endpoints here when deprecating them
 *
 * @example
 * {
 *   '/api/auth/legacy-login': {
 *     deprecatedSince: '1.0',
 *     sunsetDate: '2025-12-31',
 *     replacement: '/api/auth/login',
 *     reason: 'Use new authentication flow with CSRF protection'
 *   }
 * }
 */
interface DeprecatedEndpoint {
  deprecatedSince: string
  sunsetDate: string // ISO 8601 date
  replacement?: string
  reason?: string
}

const deprecatedEndpoints: Record<string, DeprecatedEndpoint> = {
  // Example: '/api/v0/summaries': {
  //   deprecatedSince: '1.0',
  //   sunsetDate: '2025-12-31',
  //   replacement: '/api/summaries',
  //   reason: 'Migrated to new summary engine with GPT-4 support'
  // }
}

/**
 * API Version Middleware
 * Adds version headers to all API responses
 */
export async function apiVersionMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Add current API version header
  reply.header('X-API-Version', CURRENT_API_VERSION)
  reply.header('X-API-Latest-Version', LATEST_API_VERSION)

  // Check if endpoint is deprecated
  const path = request.url.split('?')[0] || request.url // Remove query params
  const deprecatedInfo = deprecatedEndpoints[path]

  if (deprecatedInfo) {
    reply.header('X-API-Deprecated', 'true')
    reply.header('X-API-Deprecated-Since', deprecatedInfo.deprecatedSince)
    reply.header('X-API-Sunset', deprecatedInfo.sunsetDate)

    if (deprecatedInfo.replacement) {
      reply.header('X-API-Replacement', deprecatedInfo.replacement)
    }

    // Log deprecation usage for monitoring
    request.log.warn({
      deprecatedEndpoint: path,
      replacement: deprecatedInfo.replacement,
      sunsetDate: deprecatedInfo.sunsetDate,
      userAgent: request.headers['user-agent'],
      ip: request.ip,
    }, 'Deprecated API endpoint accessed')
  }

  // Add deprecation warning header if client is using old version
  const clientVersion = request.headers['x-api-version'] as string
  if (clientVersion && clientVersion < CURRENT_API_VERSION) {
    reply.header('Warning', `299 - "API version ${clientVersion} is outdated. Current version is ${CURRENT_API_VERSION}"`)
  }
}

/**
 * Mark an endpoint as deprecated
 * Helper function to add deprecation metadata to route
 *
 * @example
 * ```typescript
 * fastify.get('/api/legacy-endpoint', {
 *   onRequest: markDeprecated({
 *     since: '1.0',
 *     sunset: '2025-12-31',
 *     replacement: '/api/new-endpoint'
 *   })
 * }, async (request, reply) => {
 *   // Deprecated endpoint logic
 * })
 * ```
 */
export function markDeprecated(config: {
  since: string
  sunset: string
  replacement?: string
  reason?: string
}) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-API-Deprecated', 'true')
    reply.header('X-API-Deprecated-Since', config.since)
    reply.header('X-API-Sunset', config.sunset)

    if (config.replacement) {
      reply.header('X-API-Replacement', config.replacement)
    }

    request.log.warn({
      deprecatedEndpoint: request.url,
      ...config,
    }, 'Deprecated endpoint accessed')
  }
}

/**
 * Validate API version from client
 * Reject requests from very old clients
 *
 * @param minVersion - Minimum supported version
 * @returns Middleware that validates client version
 *
 * @example
 * ```typescript
 * fastify.get('/api/new-feature', {
 *   preHandler: requireMinApiVersion('1.0')
 * }, async (request, reply) => {
 *   // Only clients with version >= 1.0 can access
 * })
 * ```
 */
export function requireMinApiVersion(minVersion: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const clientVersion = request.headers['x-api-version'] as string

    if (!clientVersion) {
      // Allow requests without version header (for backwards compatibility)
      return
    }

    if (clientVersion < minVersion) {
      return reply.status(426).send({
        success: false,
        error: 'Upgrade Required',
        message: `This endpoint requires API version ${minVersion} or higher. Your version: ${clientVersion}`,
        currentVersion: CURRENT_API_VERSION,
      })
    }
  }
}
