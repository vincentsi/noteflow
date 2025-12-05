import { MetadataRoute } from 'next'
import { env } from '@/lib/env'

/**
 * Robots.txt configuration
 * Controls which pages search engines can crawl
 *
 * Production: Allow all
 * Staging/Dev: Disallow all (prevent indexing of test environments)
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = env.NEXT_PUBLIC_SITE_URL
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    rules: {
      userAgent: '*',
      allow: isProduction ? '/' : undefined,
      disallow: isProduction ? ['/api/', '/dashboard/'] : '/',
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
