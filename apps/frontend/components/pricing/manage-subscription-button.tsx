'use client'

import { useBillingPortal } from '@/lib/stripe/hooks-react-query'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/lib/i18n/provider'
import { Settings } from 'lucide-react'

/**
 * Manage Subscription Button
 * Opens Stripe Customer Portal for subscription management
 * (cancel, update payment, view invoices, change plan)
 */
export function ManageSubscriptionButton() {
  const { t } = useI18n()
  const { mutate: openBillingPortal, isPending } = useBillingPortal()

  return (
    <Button
      onClick={() => openBillingPortal()}
      disabled={isPending}
      variant="outline"
      size="lg"
      className="gap-2"
    >
      <Settings className="h-4 w-4" />
      {isPending ? t('pricing.loading') : t('pricing.manageSubscription')}
    </Button>
  )
}
