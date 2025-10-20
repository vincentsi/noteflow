'use client'

import { useCheckout } from '@/lib/stripe/hooks-react-query'
import { Button } from '@/components/ui/button'

interface StripeCheckoutProps {
  priceId: string | null
  planName: string
  isCurrentPlan: boolean
  variant?: 'default' | 'outline'
}

/**
 * Stripe Checkout Button Component
 *
 * This component is lazy-loaded to reduce initial bundle size
 * since Stripe SDK is heavy (~50KB)
 *
 * Now uses React Query for better state management and caching
 */
export function StripeCheckout({
  priceId,
  planName,
  isCurrentPlan,
  variant = 'outline',
}: StripeCheckoutProps) {
  const { mutate: createCheckout, isPending, isError } = useCheckout()

  const handleUpgrade = () => {
    if (!priceId) return
    createCheckout({
      priceId,
      planType: planName as 'PRO' | 'BUSINESS',
    })
  }

  // Show error if checkout fails
  if (isError) {
    return (
      <Button className="w-full" variant="destructive" disabled>
        Error - Try Again
      </Button>
    )
  }

  if (isCurrentPlan) {
    return (
      <Button className="w-full" disabled variant="outline">
        Current Plan
      </Button>
    )
  }

  if (!priceId) {
    return (
      <Button className="w-full" variant="outline" disabled>
        Free Forever
      </Button>
    )
  }

  return (
    <Button
      className="w-full"
      onClick={handleUpgrade}
      disabled={isPending}
      variant={variant}
    >
      {isPending ? 'Loading...' : 'Upgrade'}
    </Button>
  )
}
