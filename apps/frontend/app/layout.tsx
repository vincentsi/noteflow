import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { QueryProvider } from "@/providers/query.provider";
import { AuthProvider } from "@/providers/auth.provider";
import { ThemeProvider } from "@/providers/theme.provider";
import { I18nProvider } from "@/lib/i18n/provider";
import { ErrorBoundary } from "@/components/error-boundary";
import { OfflineIndicator } from "@/components/offline-indicator";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: {
    default: "Fullstack Boilerplate - SaaS Starter Kit",
    template: "%s | Fullstack Boilerplate"
  },
  description: "Production-ready SaaS boilerplate with authentication, payments, RBAC, and enterprise-grade features. Built with Next.js, Fastify, PostgreSQL, and TypeScript.",
  keywords: ["SaaS", "boilerplate", "Next.js", "Fastify", "TypeScript", "authentication", "Stripe", "PostgreSQL"],
  authors: [{ name: "Vincent SI" }],
  creator: "Vincent SI",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000',
    title: "Fullstack Boilerplate - SaaS Starter Kit",
    description: "Production-ready SaaS boilerplate with authentication, payments, RBAC, and enterprise-grade features.",
    siteName: "Fullstack Boilerplate",
  },
  twitter: {
    card: "summary_large_image",
    title: "Fullstack Boilerplate - SaaS Starter Kit",
    description: "Production-ready SaaS boilerplate with authentication, payments, RBAC, and enterprise-grade features.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Nonce is retrieved in middleware.ts and set in CSP headers
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* Nonce is already set in CSP headers via middleware.ts */}
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <I18nProvider>
              <QueryProvider>
                <AuthProvider>
                  {children}
                  <OfflineIndicator />
                  <Toaster />
                </AuthProvider>
              </QueryProvider>
            </I18nProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
