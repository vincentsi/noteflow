import { MetadataRoute } from 'next'
import { env } from '@/lib/env'

/**
 * Sitemap configuration
 * Helps search engines discover and index pages
 *
 * Add all public pages here (not dashboard/protected routes)
 *
 * Priority Guidelines:
 * - 1.0: Homepage
 * - 0.9: Key conversion pages (pricing, features)
 * - 0.8: Authentication pages
 * - 0.7: Secondary pages (contact, about)
 * - 0.5: Legal pages (terms, privacy)
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL
  const now = new Date()

  return [
    // Homepage
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    // Pricing (conversion page)
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    // Authentication pages
    {
      url: `${baseUrl}/login`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    // Feature pages (public landing)
    {
      url: `${baseUrl}/veille`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/summaries`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/notes`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    // Secondary pages
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
  ]
}
