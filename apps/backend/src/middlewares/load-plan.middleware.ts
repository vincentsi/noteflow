import type { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '@/config/prisma'
import { CacheService } from '@/services/cache.service'
import { PlanType } from '@prisma/client'

/**
 * Load Plan Middleware
 *
 * Dynamically loads user's current plan type from database
 * instead of relying on potentially stale JWT data.
 *
 * This solves SEC-016: When a user upgrades/downgrades their plan,
 * the JWT still contains the old plan type until it expires (15 min).
 *
 * Benefits:
 * - Always accurate plan enforcement
 * - Immediate effect when plan changes
 * - Cached for performance (60s TTL)
 *
 * @example
 * ```typescript
 * fastify.post('/premium-feature', {
 *   preHandler: [authMiddleware, loadPlanMiddleware],
 *   handler: async (request) => {
 *     // request.user.planType is always up-to-date
 *     if (request.user.planType === 'FREE') {
 *       throw new ForbiddenError('Upgrade required')
 *     }
 *   }
 * })
 * ```
 */
export async function loadPlanMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  // Require authentication
  if (!request.user) {
    return
  }

  const { userId } = request.user
  const cacheKey = `user:plan:${userId}`

  // Try cache first (60s TTL)
  const cachedPlan = await CacheService.get<string>(cacheKey)
  if (cachedPlan) {
    request.user.planType = cachedPlan as PlanType
    return
  }

  // Fetch from database
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { planType: true },
  })

  if (user) {
    request.user.planType = user.planType
    // Cache for 60 seconds
    await CacheService.set(cacheKey, user.planType, 60)
  }
}

/**
 * Invalidate plan cache when user plan changes
 * Call this after subscription updates
 *
 * @example
 * ```typescript
 * // In stripe webhook handler
 * await updateUserPlan(userId, 'PRO')
 * await invalidatePlanCache(userId)
 * ```
 */
export async function invalidatePlanCache(userId: string): Promise<void> {
  const cacheKey = `user:plan:${userId}`
  await CacheService.delete(cacheKey)
}
