import { Mail } from 'lucide-react'

export function Footer() {
  return (
    <footer className="border-t bg-background">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Brand */}
          <div className="lg:col-span-1">
            <h3 className="mb-4 text-lg font-semibold">Fullstack Boilerplate</h3>
            <p className="text-sm text-muted-foreground">
              Production-ready TypeScript boilerplate to ship your SaaS in days, not months.
            </p>
            <div className="mt-4 flex gap-4">
              <a
                href="mailto:vincent.si.dev@gmail.com"
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Contact support"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Quick Links</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="#features" className="hover:text-foreground">
                  Features
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  Pricing
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-foreground">
                  FAQ
                </a>
              </li>
              <li>
                <a
                  href="https://vincere580.gumroad.com/l/zedruw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground"
                >
                  Buy Now (79€)
                </a>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="mb-4 text-sm font-semibold">Support</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="mailto:vincent.si.dev@gmail.com" className="hover:text-foreground">
                  Email Support
                </a>
              </li>
              <li>
                <span className="text-muted-foreground">
                  MIT License
                </span>
              </li>
              <li>
                <span className="text-muted-foreground">
                  30-Day Refund Policy
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t pt-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Fullstack Boilerplate by Vincent Si. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Built with Next.js 15, Fastify & Prisma
            </p>
          </div>
        </div>
      </div>
    </footer>
  )
}
