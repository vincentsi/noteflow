import { useMutation, useQuery } from '@tanstack/react-query'
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
 * Hook to create a Stripe checkout session (React Query version)
 *
 * Benefits over manual useState:
 * - Automatic error handling
 * - Better TypeScript inference
 * - Loading state management
 * - Retry logic built-in
 */
export function useCheckout() {
  return useMutation({
    mutationFn: async ({
      priceId,
      planType,
    }: {
      priceId: string
      planType: PlanType
    }) => {
      const response = await apiClient.post('/api/stripe/create-checkout-session', {
        priceId,
        planType,
      })
      return response.data.data
    },
    onSuccess: (data: { url: string }) => {
      // Securely redirect to Stripe checkout page
      safeRedirect(data.url)
    },
  })
}

/**
 * Hook to create a billing portal session (React Query version)
 */
export function useBillingPortal() {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/stripe/create-portal-session')
      return response.data.data
    },
    onSuccess: (data: { url: string }) => {
      // Securely redirect to Stripe portal
      safeRedirect(data.url)
    },
  })
}

/**
 * Hook to fetch current subscription (React Query version)
 *
 * Benefits:
 * - Automatic caching (5 minutes stale time)
 * - Background refetch
 * - No manual useState/useEffect
 */
export function useSubscription() {
  return useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await apiClient.get('/api/stripe/subscription')
      return response.data.data.subscription as StripeSubscription
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })
}
