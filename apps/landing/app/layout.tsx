import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Fullstack Boilerplate - Ship Your SaaS in Days, Not Months',
  description:
    'Production-ready TypeScript boilerplate with authentication, payments, subscriptions, and infrastructure. Save $24,000+ and 200+ hours of development.',
  keywords: [
    'SaaS boilerplate',
    'Next.js',
    'TypeScript',
    'Stripe',
    'Authentication',
    'Production-ready',
    'Fastify',
    'Prisma',
    'PostgreSQL',
  ],
  authors: [{ name: 'Your Name' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yoursite.com',
    title: 'Fullstack Boilerplate - Ship Your SaaS in Days',
    description: 'Production-ready TypeScript boilerplate. Save $24,000+ and 200+ hours.',
    siteName: 'Fullstack Boilerplate',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Fullstack Boilerplate - Ship Your SaaS in Days',
    description: 'Production-ready TypeScript boilerplate. Save $24,000+ and 200+ hours.',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider defaultTheme="system" storageKey="landing-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
