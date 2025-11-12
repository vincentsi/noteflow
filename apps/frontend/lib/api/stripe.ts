import { apiClient } from './client'
import type { PlanType } from '@/lib/stripe/config'

/**
 * Stripe API client
 * Handles checkout sessions and billing portal
 */
export const stripeApi = {
  /**
   * Create Stripe checkout session
   * Redirects user to Stripe Checkout to subscribe
   */
  async createCheckoutSession(priceId: string, planType: PlanType) {
    const response = await apiClient.post('/api/stripe/create-checkout-session', {
      priceId,
      planType,
    })
    return response.data
  },

  /**
   * Create Stripe billing portal session
   * Redirects user to Stripe Customer Portal to manage subscription
   * (cancel, update payment method, view invoices)
   */
  async createPortalSession() {
    const response = await apiClient.post('/api/stripe/create-portal-session')
    return response.data
  },

  /**
   * Get current subscription details
   */
  async getSubscription() {
    const response = await apiClient.get('/api/stripe/subscription')
    return response.data
  },
}