import { FastifyRequest, FastifyReply } from 'fastify'
import type { Role, AuthUser } from '@/types/auth.types'

/**
 * Role-Based Access Control (RBAC) Middleware
 *
 * Optimized RBAC implementation with zero database queries:
 * - Role verification from JWT payload (no DB lookup required)
 * - Multiple role support (OR logic: user needs ANY of the allowed roles)
 * - Proper HTTP status codes (401 for auth, 403 for insufficient permissions)
 * - Type-safe role definitions (USER, ADMIN, MODERATOR)
 * - Must run AFTER authMiddleware (depends on request.user)
 *
 * @ai-prompt When modifying this middleware:
 * - NEVER query database for roles (everything in JWT payload from authMiddleware)
 * - ALWAYS return 401 if not authenticated (missing request.user)
 * - ALWAYS return 403 if authenticated but wrong role (forbidden)
 * - allowedRoles uses OR logic (user needs ANY role in the list)
 * - authMiddleware MUST run first (this middleware reads request.user)
 * - Roles are defined in Prisma schema (enum Role)
 * - request.user.role injected by authMiddleware from JWT
 * - Consider role hierarchy if implementing (e.g., ADMIN > MODERATOR > USER)
 *
 * @param allowedRoles - List of roles allowed to access the route (OR logic)
 * @returns Fastify middleware function
 *
 * @example
 * ```typescript
 * // Admin-only route
 * app.delete('/api/users/:id', {
 *   preHandler: [authMiddleware, requireRole('ADMIN')]
 * }, handler)
 *
 * // Admin OR Moderator route
 * app.post('/api/posts/:id/moderate', {
 *   preHandler: [authMiddleware, requireRole('ADMIN', 'MODERATOR')]
 * }, handler)
 *
 * // Group of admin routes
 * app.register(async (app) => {
 *   app.addHook('preHandler', authMiddleware)
 *   app.addHook('preHandler', requireRole('ADMIN'))
 *
 *   app.get('/users', listUsers)
 *   app.delete('/users/:id', deleteUser)
 * }, { prefix: '/api/admin' })
 * ```
 */
export function requireRole(...allowedRoles: Role[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Role must be available from authMiddleware (from JWT)
      const userId = request.user?.userId
      const userRole = request.user?.role

      if (!userId || !userRole) {
        return reply.status(401).send({
          success: false,
          error: 'Not authenticated',
        })
      }

      // Check if user role is in the allowed roles list
      // Performance: 0 DB queries, everything is in JWT
      if (!allowedRoles.includes(userRole as Role)) {
        return reply.status(403).send({
          success: false,
          error: 'Insufficient permissions',
          required: allowedRoles,
          current: userRole,
        })
      }
    } catch {
      return reply.status(500).send({
        success: false,
        error: 'Server error',
      })
    }
  }
}

// Extend FastifyRequest type to include user context
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser
  }
}
