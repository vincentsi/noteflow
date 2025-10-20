import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

const faqs = [
  {
    question: 'What exactly do I get?',
    answer:
      'You get the complete source code for a production-ready fullstack application with authentication, Stripe subscriptions, PostgreSQL database, Redis caching, Docker setup, CI/CD pipeline, and 15,000+ lines of documentation. Everything is yours to modify and use in unlimited projects.',
  },
  {
    question: 'Can I use this for client projects?',
    answer:
      'Yes! The license allows unlimited use for personal and commercial projects, including client work. You can modify, rebrand, and resell applications built with this boilerplate without any restrictions.',
  },
  {
    question: 'Do I need to know TypeScript?',
    answer:
      'Basic TypeScript knowledge is recommended. The codebase uses TypeScript strict mode throughout, but the comprehensive documentation explains every pattern and decision. If you know JavaScript, you can learn TypeScript while building.',
  },
  {
    question: 'Is this really production-ready?',
    answer:
      'Absolutely. It includes: 78 passing tests (Jest + Playwright), 9/10 security score, automated backups, monitoring (Sentry), distributed locks for multi-instance deployments, Nginx load balancing, and has passed a complete security audit (22/22 tasks).',
  },
  {
    question: 'What if I get stuck?',
    answer:
      'The boilerplate includes 15,000+ lines of comprehensive documentation covering every feature, pattern, and implementation detail. Each component is thoroughly explained with code examples. You can also reach out via email (vincent.si.dev@gmail.com) for support.',
  },
  {
    question: 'How are updates handled?',
    answer:
      'You get lifetime updates via Git. When we add features, fix bugs, or improve documentation, you can pull the latest changes. You keep full control over when to update your project.',
  },
  {
    question: 'Can I see the code before buying?',
    answer:
      'The product screenshots on Gumroad show the codebase structure, key implementations, and architecture. You can see examples of the authentication system, database schema, API routes, and frontend components. We also offer a 30-day money-back guarantee if the code doesn\'t meet your expectations.',
  },
  {
    question: 'What tech stack does it use?',
    answer:
      'Backend: Fastify 5, Prisma 6, PostgreSQL, Redis, BullMQ, Stripe, Sentry. Frontend: Next.js 15, shadcn/ui, TanStack Query, React Hook Form, Zod. Infrastructure: Docker, Nginx, GitHub Actions CI/CD. All in a Turborepo monorepo.',
  },
  {
    question: 'Is there a refund policy?',
    answer:
      '30-day money-back guarantee, no questions asked. If the boilerplate doesn\'t meet your needs, just email within 30 days for a full refund.',
  },
  {
    question: 'How much time will this save me?',
    answer:
      'Conservatively, 200+ hours of development time (authentication alone is 40+ hours, Stripe integration 30+ hours, testing infrastructure 20+ hours, security hardening 40+ hours, documentation 30+ hours, etc.). At $120/hr, that\'s $24,000+ in saved costs.',
  },
]

export function FAQ() {
  return (
    <section id="faq" className="py-20 sm:py-32">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="text-lg text-muted-foreground">
            Everything you need to know before getting started
          </p>
        </div>

        {/* FAQ Accordion */}
        <div className="mx-auto max-w-3xl">
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((faq, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {/* Still Have Questions */}
        <div className="mt-16 text-center">
          <p className="text-muted-foreground">
            Still have questions?{' '}
            <a href="mailto:vincent.si.dev@gmail.com" className="font-semibold text-primary hover:underline">
              Contact us
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}
