import { PlanType } from '@prisma/client'

/**
 * Plan limits for different features
 *
 * Each feature has specific limits based on user's plan type:
 * - FREE: Limited quota for trial users
 * - STARTER: Medium quota for paying users (6€/month)
 * - PRO: Unlimited for premium users (15€/month)
 */

/**
 * Monthly summary generation limits
 * - FREE: 5 summaries/month
 * - STARTER: 20 summaries/month
 * - PRO: Unlimited
 */
export const SUMMARY_LIMITS: Record<PlanType, number> = {
  [PlanType.FREE]: 5,
  [PlanType.STARTER]: 20,
  [PlanType.PRO]: Infinity,
} as const

/**
 * Saved articles limits
 * - FREE: 10 saved articles max
 * - STARTER: 50 saved articles max
 * - PRO: Unlimited
 */
export const ARTICLE_LIMITS: Record<PlanType, number> = {
  [PlanType.FREE]: 10,
  [PlanType.STARTER]: 50,
  [PlanType.PRO]: Infinity,
} as const

/**
 * Note storage limits (from MVP-PLAN.md)
 * - FREE: 20 notes max
 * - STARTER: 100 notes max
 * - PRO: Unlimited
 */
export const NOTE_LIMITS: Record<PlanType, number> = {
  [PlanType.FREE]: 20,
  [PlanType.STARTER]: 100,
  [PlanType.PRO]: Infinity,
} as const
