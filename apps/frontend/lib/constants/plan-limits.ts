/**
 * Plan limits for different features (frontend copy)
 *
 * IMPORTANT: These constants must match the backend values in:
 * apps/backend/src/constants/plan-limits.ts
 *
 * Used for client-side validation and UI display only.
 * Server-side enforcement is done in backend services.
 */

/**
 * Monthly summary generation limits
 * - FREE: 5 summaries/month
 * - STARTER: 20 summaries/month
 * - PRO: Unlimited
 */
export const SUMMARY_LIMITS = {
  FREE: 5,
  STARTER: 20,
  PRO: Infinity,
} as const

/**
 * Saved articles limits
 * - FREE: 10 saved articles max
 * - STARTER: 50 saved articles max
 * - PRO: Unlimited
 */
export const ARTICLE_LIMITS = {
  FREE: 10,
  STARTER: 50,
  PRO: Infinity,
} as const

/**
 * Note storage limits
 * - FREE: 20 notes max
 * - STARTER: 100 notes max
 * - PRO: Unlimited
 */
export const NOTE_LIMITS = {
  FREE: 20,
  STARTER: 100,
  PRO: Infinity,
} as const

export type PlanType = 'FREE' | 'STARTER' | 'PRO'
