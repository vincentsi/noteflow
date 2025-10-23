import { env } from '@/lib/env'

/**
 * Stripe Price IDs configuration
 *
 * These IDs are loaded from environment variables for production.
 * Fallback values are provided for development/testing.
 *
 * IMPORTANT: Set these in production via environment variables:
 * - NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID
 * - NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
 */

/**
 * Default Stripe Price IDs (for development)
 * Replace these with your actual Stripe test/production price IDs
 */
const DEFAULT_PRICE_IDS = {
  STARTER: 'price_starter_monthly', // Default placeholder (6€/month)
  PRO: 'price_pro_monthly', // Default placeholder (15€/month)
} as const

/**
 * Get Stripe Price ID for STARTER plan (6€/month)
 * Prioritizes environment variable, falls back to default
 */
export const STRIPE_STARTER_PRICE_ID =
  env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID || DEFAULT_PRICE_IDS.STARTER

/**
 * Get Stripe Price ID for PRO plan (15€/month)
 * Prioritizes environment variable, falls back to default
 */
export const STRIPE_PRO_PRICE_ID =
  env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID || DEFAULT_PRICE_IDS.PRO

/**
 * Check if Stripe is properly configured
 * Returns true if all required Stripe env vars are set
 */
export function isStripeConfigured(): boolean {
  return Boolean(
    env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY &&
      env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID &&
      env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
  )
}

/**
 * Get warning message if Stripe is not configured
 */
export function getStripeConfigWarning(): string | null {
  if (isStripeConfigured()) {
    return null
  }

  const missing: string[] = []
  if (!env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
    missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY')
  if (!env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID)
    missing.push('NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID')
  if (!env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID)
    missing.push('NEXT_PUBLIC_STRIPE_PRO_PRICE_ID')

  return `Stripe not fully configured. Missing: ${missing.join(', ')}`
}
