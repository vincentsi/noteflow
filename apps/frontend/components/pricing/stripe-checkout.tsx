'use client'

import { useCheckout, useBillingPortal } from '@/lib/stripe/hooks-react-query'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'
import { useAuth } from '@/providers/auth.provider'
import Link from 'next/link'

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
  const { t } = useI18n()
  const { isAuthenticated, user } = useAuth()
  const { mutate: createCheckout, isPending: isCheckoutPending, isError: isCheckoutError } = useCheckout()
  const { mutate: openBillingPortal, isPending: isPortalPending } = useBillingPortal()

  // Check if user has an active subscription (STARTER or PRO)
  const hasActiveSubscription = user?.planType && user.planType !== 'FREE'

  const handleUpgrade = () => {
    if (!priceId) return

    // If user has an active subscription, redirect to billing portal to manage/upgrade
    if (hasActiveSubscription) {
      openBillingPortal()
    } else {
      // New subscription - create checkout session
      createCheckout({
        priceId,
        planType: planName as 'PRO' | 'BUSINESS',
      })
    }
  }

  const isPending = isCheckoutPending || isPortalPending

  // Show error if checkout fails
  if (isCheckoutError) {
    return (
      <Button className="w-full" variant="destructive" disabled>
        {t('pricing.error')}
      </Button>
    )
  }

  // If user is not authenticated, show "Sign up" button
  if (!isAuthenticated) {
    if (!priceId) {
      // For FREE plan, show "Current plan" as disabled
      return (
        <Button className="w-full" variant="outline" disabled>
          {t('pricing.currentPlan')}
        </Button>
      )
    }
    // For paid plans, show "Sign up" button
    return (
      <Button className="w-full" variant={variant} asChild>
        <Link href="/register">{t('pricing.signUp')}</Link>
      </Button>
    )
  }

  if (isCurrentPlan) {
    return (
      <Button className="w-full" disabled variant="outline">
        {t('pricing.currentPlan')}
      </Button>
    )
  }

  if (!priceId) {
    return (
      <Button className="w-full" variant="outline" disabled>
        {t('pricing.free')}
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
      {isPending ? t('pricing.loading') : t('pricing.upgrade')}
    </Button>
  )
}
