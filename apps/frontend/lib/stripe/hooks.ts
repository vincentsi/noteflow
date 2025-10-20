import { useState } from 'react'
import { apiClient } from '@/lib/api/client'
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

      // Redirect to Stripe checkout page
      window.location.href = url
    } catch (err) {
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

      // Redirect to Stripe portal
      window.location.href = url
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
