import { ArrowRight, Star } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background to-muted/50 py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-background/50 px-4 py-2 text-sm backdrop-blur">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="font-medium">Production-Ready Fullstack Boilerplate</span>
          </div>

          {/* Title */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Ship Your SaaS in{' '}
            <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Days, Not Months
            </span>
          </h1>

          {/* Description */}
          <p className="mb-10 text-lg text-muted-foreground sm:text-xl">
            Professional TypeScript boilerplate with authentication, payments, subscriptions, and production-ready infrastructure.
            <br />
            <strong className="font-semibold text-foreground">Save $24,000+ and 200+ hours of development.</strong>
          </p>

          {/* CTA Button */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" className="gap-2" asChild>
              <a href="https://vincere580.gumroad.com/l/zedruw" target="_blank" rel="noopener noreferrer">
                Get Started - 79€
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>

          {/* Social Proof */}
          <div className="mt-12 flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
            <div className="text-center">
              <div className="text-2xl font-bold">200+</div>
              <div className="text-sm text-muted-foreground">Hours Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">$24k+</div>
              <div className="text-sm text-muted-foreground">Dev Cost Saved</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">78</div>
              <div className="text-sm text-muted-foreground">Tests Passing</div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Gradient */}
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px]" />
    </section>
  )
}
