'use client'

import { Suspense } from 'react'
import dynamic from 'next/dynamic'
import { useAuth } from '@/providers/auth.provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Check } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import {
  STRIPE_PRO_PRICE_ID,
  STRIPE_BUSINESS_PRICE_ID,
} from '@/lib/constants/stripe'

// Lazy load heavy components (reduces initial bundle)
const StripeCheckout = dynamic(
  () => import('@/components/pricing/stripe-checkout').then(mod => ({ default: mod.StripeCheckout })),
  {
    loading: () => <Skeleton className="h-10 w-full" />,
    ssr: false,
  }
)

const PLANS = [
  {
    name: 'FREE',
    price: '$0',
    description: 'Perfect for getting started',
    features: [
      'Basic features',
      'Community support',
      '1 user',
      'Limited storage',
    ],
    priceId: null, // No Stripe price ID for free plan
  },
  {
    name: 'PRO',
    price: '$15',
    period: '/month',
    description: 'For professionals and small teams',
    features: [
      'All FREE features',
      'Advanced analytics',
      'Priority support',
      '5 users',
      'Unlimited storage',
      'API access',
    ],
    priceId: STRIPE_PRO_PRICE_ID, // Loaded from env: NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
    highlighted: true,
  },
  {
    name: 'BUSINESS',
    price: '$50',
    period: '/month',
    description: 'For large teams and enterprises',
    features: [
      'All PRO features',
      'Dedicated support',
      'Unlimited users',
      'Advanced security',
      'Custom integrations',
      'SLA guarantee',
    ],
    priceId: STRIPE_BUSINESS_PRICE_ID, // Loaded from env: NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID
  },
]

export default function PricingPage() {
  const { user } = useAuth()
  const currentPlan = user?.planType || 'FREE'

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Choose Your Plan</h1>
        <p className="text-muted-foreground mt-2">
          Select the plan that best fits your needs
        </p>
        {currentPlan && (
          <p className="text-sm text-muted-foreground mt-2">
            Current plan: <span className="font-semibold">{currentPlan}</span>
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
                    Most Popular
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
        <p>All plans include 14-day money-back guarantee</p>
        <p className="mt-1">Questions? Contact support@example.com</p>
      </div>
    </div>
  )
}
