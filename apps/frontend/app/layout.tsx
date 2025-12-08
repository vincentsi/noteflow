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
import { OrganizationSchema, WebsiteSchema, SoftwareApplicationSchema } from "@/components/seo/schema-markup";

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
    default: "NotePostFlow - Veille IA, Résumés AI & Notes pour Développeurs",
    template: "%s | NotePostFlow"
  },
  description: "Plateforme tout-en-un pour développeurs : veille technologique RSS, résumés de contenu par IA (texte, PDF, URL), et prise de notes Markdown avec tags. Gagnez du temps avec l'intelligence artificielle.",
  keywords: ["veille technologique", "résumé IA", "OpenAI", "RSS feed", "agrégateur", "prise de notes", "markdown", "développeurs", "productivité", "intelligence artificielle", "summarization", "NotePostFlow"],
  authors: [{ name: "Vincent SI" }],
  creator: "Vincent SI",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: env.NEXT_PUBLIC_SITE_URL,
    title: "NotePostFlow - Veille IA, Résumés AI & Notes pour Développeurs",
    description: "Plateforme tout-en-un pour développeurs : veille technologique RSS, résumés de contenu par IA, et prise de notes Markdown. Gagnez du temps avec l'intelligence artificielle.",
    siteName: "NotePostFlow",
    images: [
      {
        url: `${env.NEXT_PUBLIC_SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "NotePostFlow - Veille IA et Résumés pour Développeurs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "NotePostFlow - Veille IA, Résumés AI & Notes pour Développeurs",
    description: "Plateforme tout-en-un pour développeurs : veille technologique RSS, résumés de contenu par IA, et prise de notes Markdown.",
    images: [`${env.NEXT_PUBLIC_SITE_URL}/og-image.png`],
    creator: "@VincentSI_dev",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: env.NEXT_PUBLIC_SITE_URL,
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
        {/* PWA manifest and theme */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
        {/* Schema.org Structured Data for SEO */}
        <OrganizationSchema />
        <WebsiteSchema />
        <SoftwareApplicationSchema />
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
