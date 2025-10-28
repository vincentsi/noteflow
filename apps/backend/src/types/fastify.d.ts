import 'fastify'
import type { Subscription, Role, PlanType } from '@prisma/client'

/**
 * Extends Fastify types to add custom properties
 *
 * These augmentations add type safety for:
 * - request.user: Populated by authMiddleware
 * - request.subscription: Populated by subscriptionMiddleware
 */
declare module 'fastify' {
  interface FastifyRequest {
    /**
     * User information from JWT token
     * Populated by authMiddleware
     */
    user?: {
      userId: string
      role: Role
      email: string
      planType?: PlanType
    }

    /**
     * User subscription information
     * Populated by subscriptionMiddleware or loadSubscription middleware
     */
    subscription?: Subscription | null
  }

  /**
   * Custom route configuration options
   */
  interface RouteShorthandOptions {
    /**
     * Rate limit configuration for this specific route
     */
    rateLimit?: {
      max: number
      timeWindow: number | string
      keyGenerator?: (request: FastifyRequest) => string
    }
  }
}
