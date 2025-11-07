'use client'

import { Suspense, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/providers/auth.provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  STRIPE_STARTER_PRICE_ID,
  STRIPE_PRO_PRICE_ID,
} from '@/lib/constants/stripe'
import { useI18n } from '@/lib/i18n/provider'
import { useQueryClient } from '@tanstack/react-query'

// Lazy load heavy components (reduces initial bundle)
const StripeCheckout = dynamic(
  () => import('@/components/pricing/stripe-checkout').then(mod => ({ default: mod.StripeCheckout })),
  {
    loading: () => <Skeleton className="h-10 w-full" />,
    ssr: false,
  }
)

export default function PricingPage() {
  const { t } = useI18n()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const currentPlan = user?.planType || 'FREE'

  // Auto-refresh user data when returning from Stripe billing portal
  // This ensures plan changes are reflected immediately in the UI
  useEffect(() => {
    // Check if user just returned from billing portal by detecting navigation timing
    // The billing portal redirects back to /pricing after subscription changes
    const hasNavigated = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming

    // If user navigated to this page (not initial load or reload), refresh user data
    if (hasNavigated && hasNavigated.type === 'navigate' && document.referrer.includes('stripe.com')) {
      // Wait 3 seconds to allow Stripe webhook to process
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['me'] })
      }, 3000)
    }
  }, [queryClient])

  const PLANS = [
    {
      name: 'FREE',
      price: '0€',
      description: t('pricing.plans.FREE.description'),
      features: [
        t('pricing.plans.FREE.features.0'),
        t('pricing.plans.FREE.features.1'),
        t('pricing.plans.FREE.features.2'),
        t('pricing.plans.FREE.features.3'),
        t('pricing.plans.FREE.features.4'),
      ],
      priceId: null,
    },
    {
      name: 'STARTER',
      price: '6€',
      period: t('pricing.perMonth'),
      description: t('pricing.plans.STARTER.description'),
      features: [
        t('pricing.plans.STARTER.features.0'),
        t('pricing.plans.STARTER.features.1'),
        t('pricing.plans.STARTER.features.2'),
        t('pricing.plans.STARTER.features.3'),
        t('pricing.plans.STARTER.features.4'),
      ],
      priceId: STRIPE_STARTER_PRICE_ID,
      highlighted: true,
    },
    {
      name: 'PRO',
      price: '15€',
      period: t('pricing.perMonth'),
      description: t('pricing.plans.PRO.description'),
      features: [
        t('pricing.plans.PRO.features.0'),
        t('pricing.plans.PRO.features.1'),
        t('pricing.plans.PRO.features.2'),
        t('pricing.plans.PRO.features.3'),
        t('pricing.plans.PRO.features.4'),
        t('pricing.plans.PRO.features.5'),
      ],
      priceId: STRIPE_PRO_PRICE_ID,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">{t('pricing.title')}</h1>
        <p className="text-muted-foreground mt-2">
          {t('pricing.subtitle')}
        </p>
        {currentPlan && (
          <p className="text-sm text-muted-foreground mt-2">
            {t('pricing.currentPlan', { plan: currentPlan })}
          </p>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrentPlan = currentPlan === plan.name

          return (
            <Card
              key={plan.name}
              className={`relative ${plan.highlighted ? 'border-primary shadow-lg' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    {t('pricing.mostPopular')}
                  </span>
                </div>
              )}

              <CardHeader>
                <CardTitle className="text-2xl" data-testid={`plan-${plan.name.toLowerCase()}`}>
                  {plan.name}
                </CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && (
                    <span className="text-muted-foreground">{plan.period}</span>
                  )}
                </div>
              </CardHeader>

              <CardContent>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Suspense fallback={<Skeleton className="h-10 w-full" />}>
                  <StripeCheckout
                    priceId={plan.priceId}
                    planName={plan.name}
                    isCurrentPlan={isCurrentPlan}
                    variant={plan.highlighted ? 'default' : 'outline'}
                  />
                </Suspense>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        <p>{t('pricing.footer.moneyBack')}</p>
        <p className="mt-1">{t('pricing.footer.support')}</p>
      </div>
    </div>
  )
}
