import {
  Shield,
  Zap,
  Database,
  Lock,
  CreditCard,
  Users,
  BarChart3,
  FileText,
  Globe,
  Workflow,
  TestTube2,
  Boxes
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const features = [
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'CSRF protection, rate limiting, Helmet, IP whitelisting, and comprehensive audit logs.',
  },
  {
    icon: Lock,
    title: 'Complete Authentication',
    description: 'JWT tokens, refresh tokens, email verification, password reset, RBAC, and soft delete with audit trails.',
  },
  {
    icon: CreditCard,
    title: 'Stripe Subscriptions',
    description: 'Full subscription system with 3 plans, webhooks, billing portal, and async queue processing.',
  },
  {
    icon: Database,
    title: 'Production Database',
    description: 'PostgreSQL with Prisma ORM, automated backups (S3 streaming), composite indexes, and migration system.',
  },
  {
    icon: Zap,
    title: 'High Performance',
    description: 'Redis caching, distributed locks (Redlock), job queues (BullMQ), Nginx load balancing, and optimized bundle.',
  },
  {
    icon: Users,
    title: 'Multi-Instance Ready',
    description: 'Horizontal scaling with Nginx (2+ backend instances), health checks, distributed locks, and zero-downtime deploys.',
  },
  {
    icon: BarChart3,
    title: 'Monitoring & Logging',
    description: 'Sentry error tracking, structured Pino logging (8 helpers), performance metrics, and Prometheus ready.',
  },
  {
    icon: TestTube2,
    title: 'Complete Test Suite',
    description: '78 tests passing (42 backend + 36 frontend), Jest, Playwright E2E, 79%+ coverage, CI/CD pipeline.',
  },
  {
    icon: FileText,
    title: 'API Documentation',
    description: 'OpenAPI/Swagger UI, auto-generated schemas, interactive explorer, and 15,000+ lines of docs.',
  },
  {
    icon: Globe,
    title: 'Modern Frontend',
    description: 'Next.js 15, shadcn/ui, TanStack Query, React Hook Form, Zod validation, and TypeScript strict mode.',
  },
  {
    icon: Workflow,
    title: 'CI/CD Pipeline',
    description: 'GitHub Actions workflow with automated testing, linting, type-checking, PostgreSQL + Redis containers.',
  },
  {
    icon: Boxes,
    title: 'Turborepo Monorepo',
    description: 'Optimized build caching, shared configs (TypeScript, ESLint, Prettier), and package management.',
  },
]

export function Features() {
  return (
    <section id="features" className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Everything You Need to Launch
          </h2>
          <p className="text-lg text-muted-foreground">
            Production-ready features that would take months to build from scratch.
            <br />
            All tested, documented, and ready to deploy.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title} className="transition-all hover:shadow-lg">
                <CardHeader>
                  <div className="mb-2 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Stats Bar */}
        <div className="mt-16 rounded-lg border bg-muted/50 p-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold">22/22</div>
              <div className="text-sm text-muted-foreground">Security Audit Tasks</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold">15,000+</div>
              <div className="text-sm text-muted-foreground">Lines of Documentation</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold">100%</div>
              <div className="text-sm text-muted-foreground">TypeScript Strict Mode</div>
            </div>
            <div className="text-center">
              <div className="mb-2 text-3xl font-bold">Production</div>
              <div className="text-sm text-muted-foreground">Ready Infrastructure</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
