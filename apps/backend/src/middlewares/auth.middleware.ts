import type { FastifyRequest, FastifyReply } from 'fastify'
import { authService } from '@/services/auth.service'
import type { Role } from '@/types/auth.types'

/**
 * JWT Authentication Middleware
 *
 * Verifies JWT tokens and injects user context into request with:
 * - Cookie-first authentication (accessToken cookie has priority)
 * - Authorization header fallback (Bearer token for API compatibility)
 * - JWT payload extraction (userId, role, email injected into request.user)
 * - Zero database queries (all data from JWT, enables RBAC optimization)
 * - Proper error handling (401 for missing/invalid/expired tokens)
 *
 * @ai-prompt When modifying this middleware:
 * - ALWAYS check cookies FIRST, then fallback to Authorization header (cookie priority)
 * - NEVER make DB queries here (defeats purpose of JWT, causes N+1 queries)
 * - JWT payload MUST include: userId, role, email (required for RBAC + user context)
 * - request.user is injected for downstream handlers (type-safe via module augmentation)
 * - Bearer token format: "Bearer <token>" (split by space, validate 2 parts)
 * - Invalid tokens return 401 (not 403, which is for authorization)
 * - This middleware runs BEFORE rbac/subscription middlewares (chain order matters)
 * - Used in combination with requireRole() and requireSubscription()
 *
 * @example
 * ```typescript
 * // Protected route with auth
 * app.get('/api/auth/me', {
 *   preHandler: authMiddleware
 * }, async (request, reply) => {
 *   const { userId, role, email } = request.user!  // Injected by middleware
 *   return { userId, role, email }
 * })
 *
 * // Protected route with RBAC
 * app.delete('/api/users/:id', {
 *   preHandler: [authMiddleware, requireRole('ADMIN')]
 * }, handler)
 * ```
 *
 * @example
 * ```bash
 * # Cookie authentication (preferred)
 * curl --cookie "accessToken=eyJhbGc..." http://localhost:3001/api/auth/me
 *
 * # Header authentication (fallback)
 * curl -H "Authorization: Bearer eyJhbGc..." http://localhost:3001/api/auth/me
 * ```
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Get token from cookies (priority) or Authorization header (fallback)
    let token = request.cookies.accessToken

    if (!token) {
      // Fallback: Authorization header for compatibility
      const authHeader = request.headers.authorization

      if (authHeader) {
        const parts = authHeader.split(' ')
        if (parts.length === 2 && parts[0] === 'Bearer') {
          token = parts[1]
        }
      }
    }

    if (!token) {
      return reply.status(401).send({
        success: false,
        error: 'No access token provided',
      })
    }

    // Verify token
    const payload = authService.verifyAccessToken(token)

    // Inject userId, role and email into request for handlers
    // Email is now in JWT to avoid DB query on every request (N+1 query fix)
    request.user = {
      userId: payload.userId,
      role: payload.role as Role,
      email: payload.email,
    }
  } catch (error) {
    if (error instanceof Error) {
      return reply.status(401).send({
        success: false,
        error: error.message,
      })
    }

    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
    })
  }
}
