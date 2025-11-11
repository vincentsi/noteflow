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
import { Analytics } from "@vercel/analytics/react";
import { env } from "@/lib/env";

export const dynamic = 'force-dynamic'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: {
    default: "NoteFlow - AI-Powered Note Taking & Content Summarization",
    template: "%s | NoteFlow"
  },
  description: "NoteFlow combines AI-powered content summarization, markdown note-taking, and RSS feed aggregation for developers. Save time with intelligent summaries and organized notes.",
  keywords: ["AI", "note-taking", "summarization", "RSS", "markdown", "developers", "productivity", "OpenAI"],
  authors: [{ name: "Vincent SI" }],
  creator: "Vincent SI",
  openGraph: {
    type: "website",
    locale: "fr_FR",
    url: env.NEXT_PUBLIC_SITE_URL,
    title: "NoteFlow - AI-Powered Note Taking & Content Summarization",
    description: "NoteFlow combines AI-powered content summarization, markdown note-taking, and RSS feed aggregation for developers.",
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
                  <Analytics />
                </AuthProvider>
              </QueryProvider>
            </I18nProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
