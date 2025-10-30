import type { FastifyRequest } from 'fastify'
import { UnauthorizedError } from './custom-errors'

/**
 * Extracts and validates the authenticated user ID from the request.
 *
 * This utility eliminates the need for repetitive authentication checks
 * in every protected controller method.
 *
 * **Usage:**
 * ```typescript
 * async createNote(request: FastifyRequest, reply: FastifyReply) {
 *   try {
 *     const userId = requireAuth(request) // Single line!
 *     // ... rest of logic
 *   } catch (error) {
 *     return handleControllerError(error, request, reply)
 *   }
 * }
 * ```
 *
 * **Before (6 lines):**
 * ```typescript
 * const userId = request.user?.userId
 * if (!userId) {
 *   return reply.status(401).send({
 *     success: false,
 *     error: 'Unauthorized',
 *     message: 'User not authenticated',
 *   })
 * }
 * ```
 *
 * **After (1 line):**
 * ```typescript
 * const userId = requireAuth(request)
 * ```
 *
 * @param request - Fastify request object with authenticated user
 * @throws {UnauthorizedError} if user is not authenticated
 * @returns The authenticated user ID
 *
 * @example
 * ```typescript
 * import { requireAuth } from '@/utils/require-auth'
 *
 * async myProtectedHandler(request: FastifyRequest, reply: FastifyReply) {
 *   try {
 *     const userId = requireAuth(request)
 *     // userId is guaranteed to be a string here
 *   } catch (error) {
 *     return handleControllerError(error, request, reply)
 *   }
 * }
 * ```
 */
export function requireAuth(request: FastifyRequest): string {
  const userId = request.user?.userId

  if (!userId) {
    throw new UnauthorizedError('User not authenticated')
  }

  return userId
}
