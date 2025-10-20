/**
 * Stripe Configuration
 * Contains price IDs and public key
 */

// Stripe public key (from .env)
export const STRIPE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || ''

// Stripe price IDs (configure from your Stripe dashboard)
export const STRIPE_PRICES = {
  PRO: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || 'price_xxx',
  BUSINESS: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS || 'price_xxx',
} as const

// Plans configuration
export const PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    priceId: null,
    features: [
      'Basic access',
      '10 requests / day',
      'Community support',
    ],
  },
  PRO: {
    name: 'Pro',
    price: 15,
    priceId: STRIPE_PRICES.PRO,
    features: [
      'Everything in Free',
      '1000 requests / day',
      'Data export',
      'Priority support',
    ],
  },
  BUSINESS: {
    name: 'Business',
    price: 50,
    priceId: STRIPE_PRICES.BUSINESS,
    features: [
      'Everything in Pro',
      'Unlimited requests',
      'Team management',
      'Advanced API',
      'Dedicated support',
    ],
  },
} as const

export type PlanType = keyof typeof PLANS
