import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'

export function Pricing() {
  const features = [
    'Complete source code',
    'Lifetime updates',
    'Full authentication system (JWT, OAuth ready)',
    'Stripe subscription integration',
    'PostgreSQL + Prisma ORM',
    'Redis caching with graceful degradation',
    'Docker setup (dev + production)',
    'Nginx load balancing (multi-instance ready)',
    'CI/CD pipeline (GitHub Actions)',
    'Complete test suite (78 tests passing)',
    'Comprehensive documentation (15,000+ lines)',
    'RBAC, CSRF protection, rate limiting',
    'Email verification + password reset',
    'Automated database backups (S3)',
    'Sentry monitoring integration',
    'Job queues (BullMQ) for async tasks',
    'Community support (GitHub Issues)',
  ]

  return (
    <section id="pricing" className="py-20 sm:py-32 bg-muted/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground">
            One-time payment. Lifetime access. No subscriptions.
            <br />
            <strong className="font-semibold text-foreground">50% off launch special - Limited time!</strong>
          </p>
        </div>

        {/* Single Pricing Card */}
        <div className="mx-auto max-w-lg">
          <Card className="relative flex flex-col border-primary shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl">Fullstack Boilerplate</CardTitle>
              <CardDescription className="text-base">
                Everything you need to ship your SaaS
              </CardDescription>
              <div className="mt-6 flex items-baseline justify-center gap-2">
                <span className="text-5xl font-bold tracking-tight">79€</span>
                <span className="text-2xl text-muted-foreground line-through">159€</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">One-time payment</p>
            </CardHeader>

            <CardContent className="flex-1">
              <ul className="space-y-3">
                {features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="h-5 w-5 shrink-0 text-primary mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>

            <CardFooter className="flex-col gap-4">
              <Button className="w-full" size="lg" asChild>
                <a href="https://vincere580.gumroad.com/l/zedruw" target="_blank" rel="noopener noreferrer">
                  Get Started - 79€
                </a>
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Instant download after payment
              </p>
            </CardFooter>
          </Card>
        </div>

        {/* Money Back Guarantee */}
        <div className="mt-16 text-center">
          <div className="mx-auto max-w-2xl rounded-lg border bg-background p-8">
            <h3 className="mb-2 text-xl font-semibold">30-Day Money-Back Guarantee</h3>
            <p className="text-muted-foreground">
              Not satisfied? Get a full refund within 30 days, no questions asked.
              <br />
              We&apos;re confident you&apos;ll love this boilerplate.
            </p>
          </div>
        </div>

        {/* Value Comparison */}
        <div className="mt-12 text-center">
          <p className="text-sm text-muted-foreground">
            🚀 Building this from scratch: <strong className="text-foreground">24,000€+ (200+ hours at 120€/hr)</strong>
            <br />
            💰 Your investment: <strong className="text-primary">79€</strong>
            <br />
            ✅ Savings: <strong className="text-foreground">99.7% cost reduction</strong>
          </p>
        </div>
      </div>
    </section>
  )
}
