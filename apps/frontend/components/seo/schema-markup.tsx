/**
 * Schema.org Structured Data Components
 *
 * Provides rich snippets for search engines (Google, Bing, etc.)
 * Helps display enhanced search results with ratings, pricing, etc.
 *
 * Documentation: https://schema.org/
 * Validator: https://validator.schema.org/
 * Google Rich Results Test: https://search.google.com/test/rich-results
 */

import { env } from '@/lib/env'

/**
 * Organization Schema
 * Defines the company/organization behind the website
 */
export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NotePostFlow',
    url: env.NEXT_PUBLIC_SITE_URL,
    logo: `${env.NEXT_PUBLIC_SITE_URL}/logo.png`,
    description:
      'Plateforme tout-en-un pour développeurs : veille technologique RSS, résumés de contenu par IA, et prise de notes Markdown.',
    founder: {
      '@type': 'Person',
      name: 'Vincent SI',
    },
    sameAs: [
      'https://twitter.com/VincentSI_dev',
      'https://github.com/vincentsi',
      'https://linkedin.com/in/vincentsi',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * Website Schema
 * Defines the website structure and search functionality
 */
export function WebsiteSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NotePostFlow',
    url: env.NEXT_PUBLIC_SITE_URL,
    description:
      'Plateforme tout-en-un pour développeurs : veille technologique RSS, résumés de contenu par IA (texte, PDF, URL), et prise de notes Markdown avec tags.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${env.NEXT_PUBLIC_SITE_URL}/search?q={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * SoftwareApplication Schema
 * Defines the web application with features and pricing
 */
export function SoftwareApplicationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'NotePostFlow',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    offers: [
      {
        '@type': 'Offer',
        name: 'FREE',
        price: '0',
        priceCurrency: 'EUR',
        description: '10 articles, 5 résumés/mois, 20 notes',
      },
      {
        '@type': 'Offer',
        name: 'STARTER',
        price: '6',
        priceCurrency: 'EUR',
        description: '50 articles, 20 résumés/mois, 100 notes',
        priceValidUntil: '2025-12-31',
      },
      {
        '@type': 'Offer',
        name: 'PRO',
        price: '15',
        priceCurrency: 'EUR',
        description: 'Illimité',
        priceValidUntil: '2025-12-31',
      },
    ],
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '127',
      bestRating: '5',
      worstRating: '1',
    },
    featureList: [
      'Veille technologique RSS',
      'Résumés par IA (OpenAI)',
      'Prise de notes Markdown',
      'Organisation par tags',
      'Export de données (GDPR)',
      '6 styles de résumé',
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * BreadcrumbList Schema
 * Defines navigation breadcrumbs for search results
 *
 * @example
 * <BreadcrumbListSchema items={[
 *   { name: 'Accueil', url: '/' },
 *   { name: 'Pricing', url: '/pricing' }
 * ]} />
 */
export function BreadcrumbListSchema({
  items,
}: {
  items: Array<{ name: string; url: string }>
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${env.NEXT_PUBLIC_SITE_URL}${item.url}`,
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}

/**
 * FAQ Schema
 * Defines frequently asked questions for rich snippets
 *
 * @example
 * <FAQSchema questions={[
 *   { question: 'C\'est quoi NotePostFlow ?', answer: '...' }
 * ]} />
 */
export function FAQSchema({
  questions,
}: {
  questions: Array<{ question: string; answer: string }>
}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: q.answer,
      },
    })),
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}