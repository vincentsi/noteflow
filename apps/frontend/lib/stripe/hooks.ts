import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
import { safeRedirect } from '@/lib/utils/url-validator'
import { PlanType } from './config'

/**
 * Type for Stripe subscription
 */
type StripeSubscription = {
  id: string
  status: string
  planType: PlanType
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
} | null

/**
 * Hook to create a Stripe checkout session
 */
export function useCheckout() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCheckoutSession = async (
    priceId: string,
    planType: PlanType
  ): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post('/api/stripe/create-checkout-session', {
        priceId,
        planType,
      })

      const { url } = response.data.data

      // Securely redirect to Stripe checkout page
      safeRedirect(url)
    } catch (err: unknown) {
      // Check if error indicates need for billing portal (upgrade/downgrade)
      if (
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object' &&
        'requiresBillingPortal' in err.response.data &&
        err.response.data.requiresBillingPortal === true
      ) {
        // User needs to use billing portal for plan changes
        // Redirect to billing portal
        try {
          const portalResponse = await apiClient.post('/api/stripe/create-portal-session')
          const { url } = portalResponse.data.data
          safeRedirect(url)
          return
        } catch (portalErr) {
          const portalMessage =
            portalErr instanceof Error
              ? portalErr.message
              : 'Error opening billing portal'
          setError(portalMessage)
          setLoading(false)
          return
        }
      }

      const message =
        err instanceof Error ? err.message : 'Error creating checkout session'
      setError(message)
      setLoading(false)
    }
  }

  return { createCheckoutSession, loading, error }
}

/**
 * Hook to create a billing portal session
 */
export function useBillingPortal() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const openBillingPortal = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.post('/api/stripe/create-portal-session')

      const { url } = response.data.data

      // Securely redirect to Stripe portal
      safeRedirect(url)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Error opening billing portal'
      setError(message)
      setLoading(false)
    }
  }

  return { openBillingPortal, loading, error }
}

/**
 * Hook to fetch current subscription
 */
export function useSubscription() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [subscription, setSubscription] = useState<StripeSubscription>(null)

  const fetchSubscription = async (): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiClient.get('/api/stripe/subscription')
      setSubscription(response.data.data.subscription)
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Error fetching subscription'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return { subscription, fetchSubscription, loading, error }
}
