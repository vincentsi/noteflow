import { FastifyRequest, FastifyReply } from 'fastify'
import { PlanType } from '@prisma/client'
import { stripeService } from '@/services/stripe.service'

/**
 * Subscription Middleware (Plan-Based Access Control)
 *
 * Verifies user subscription status with plan hierarchy:
 * - FREE (0) - Default plan, no payment required
 * - STARTER (1) - 6€/month, includes STARTER features
 * - PRO (2) - 15€/month, includes STARTER + PRO features
 *
 * **Plan Hierarchy Logic:**
 * - STARTER users can access STARTER features (hierarchy: STARTER >= STARTER)
 * - PRO users can access both STARTER and PRO features (hierarchy: PRO >= STARTER/PRO)
 * - FREE users cannot access paid features
 *
 * @ai-prompt When modifying this middleware:
 * - ALWAYS respect plan hierarchy (PRO >= STARTER >= FREE)
 * - hasFeatureAccess() uses cached data (5min TTL, see stripe.service.ts)
 * - requireSubscription() checks specific plan level
 * - requireActiveSubscription() checks ANY paid plan (STARTER or PRO)
 * - Must run AFTER authMiddleware (depends on request.user)
 * - Returns 401 if not authenticated, 403 if insufficient plan
 * - Error responses include requiredPlan field (helps frontend show upgrade UI)
 * - Consider grace period for expired subscriptions (not implemented)
 * - Subscription status: ACTIVE, TRIALING, PAST_DUE, CANCELED, etc.
 *
 * @param requiredPlan - Minimum required plan (PlanType.STARTER or PlanType.PRO)
 * @returns Fastify middleware function
 *
 * @example
 * ```typescript
 * // STARTER feature (accessible to STARTER and PRO users)
 * app.post('/api/analytics/basic', {
 *   preHandler: [authMiddleware, requireSubscription(PlanType.STARTER)]
 * }, handler)
 *
 * // PRO-only feature
 * app.post('/api/analytics/advanced', {
 *   preHandler: [authMiddleware, requireSubscription(PlanType.PRO)]
 * }, handler)
 *
 * // Any paid plan (STARTER or PRO)
 * app.get('/api/premium/content', {
 *   preHandler: [authMiddleware, requireActiveSubscription]
 * }, handler)
 * ```
 */
export function requireSubscription(requiredPlan: PlanType) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Not authenticated',
        })
      }

      // Check feature access
      const hasAccess = await stripeService.hasFeatureAccess(
        userId,
        requiredPlan
      )

      if (!hasAccess) {
        return reply.status(403).send({
          success: false,
          error: 'Subscription required',
          message: `This feature requires ${requiredPlan} plan or higher`,
          requiredPlan,
        })
      }

      // User has access, continue
    } catch (error) {
      request.log.error(error)
      return reply.status(500).send({
        success: false,
        error: 'Failed to verify subscription',
      })
    }
  }
}

/**
 * Middleware to verify user has an active subscription
 * (Any paid plan: STARTER or PRO)
 *
 * @example
 * ```typescript
 * fastify.addHook('preHandler', requireActiveSubscription)
 * ```
 */
export async function requireActiveSubscription(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    const userId = request.user?.userId

    if (!userId) {
      return reply.status(401).send({
        success: false,
        error: 'Not authenticated',
      })
    }

    const hasSubscription = await stripeService.hasActiveSubscription(userId)

    if (!hasSubscription) {
      return reply.status(403).send({
        success: false,
        error: 'Active subscription required',
        message: 'This feature requires an active subscription',
      })
    }

    // User has active subscription
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({
      success: false,
      error: 'Failed to verify subscription',
    })
  }
}
