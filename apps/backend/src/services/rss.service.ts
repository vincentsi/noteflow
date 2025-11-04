import Parser from 'rss-parser'
import { validateUrlForFetch } from '@/utils/url-validator'
import { sanitizeText } from '@/utils/sanitize'

export interface ParsedArticle {
  title: string
  url: string
  excerpt: string
  imageUrl?: string
  publishedAt: Date
  source: string
}

interface RSSItem {
  title?: string
  link?: string
  contentSnippet?: string
  content?: string
  pubDate?: string
  isoDate?: string
  enclosure?: {
    url?: string
    type?: string
  }
  'media:content'?: {
    $?: {
      url?: string
    }
  }
  'media:thumbnail'?: {
    $?: {
      url?: string
    }
  }
  'content:encoded'?: string
  itunes?: {
    image?: string
  }
  image?: string
}

export class RSSService {
  private parser: Parser

  constructor() {
    this.parser = new Parser({
      timeout: 10000,
      headers: {
        'User-Agent': 'NoteFlow RSS Reader',
      },
    })
  }

  async parseFeed(url: string): Promise<ParsedArticle[]> {
    try {
      // SECURITY: Validate URL before fetching to prevent SSRF
      validateUrlForFetch(url)

      const feed = await this.parser.parseURL(url)

      const articles: ParsedArticle[] = feed.items.map(item => ({
        // SECURITY: Sanitize all text content to prevent XSS using DOMPurify
        title: sanitizeText(item.title || 'Untitled'),
        url: item.link || item.guid || '',
        excerpt: this.cleanHTML(item.contentSnippet || item.content || ''),
        imageUrl: this.sanitizeImageUrl(this.extractImageUrl(item)),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: sanitizeText(feed.title || 'Unknown Source').substring(0, 100),
      }))

      return articles
    } catch (error) {
      throw new Error(
        `Failed to parse RSS feed: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  /**
   * Extract image URL from RSS feed item
   * Tries multiple common fields where images are stored in RSS feeds
   */
  private extractImageUrl(item: RSSItem): string | undefined {
    // Try common image fields in order of preference
    // 1. enclosure with image type (common in podcasts and media RSS)
    if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
      return item.enclosure.url
    }

    // 2. media:content or media:thumbnail (Media RSS specification)
    if (item['media:content']?.$?.url) {
      return item['media:content'].$.url
    }
    if (item['media:thumbnail']?.$?.url) {
      return item['media:thumbnail'].$.url
    }

    // 3. content:encoded with img tag
    if (item['content:encoded']) {
      const imgMatch = item['content:encoded'].match(/<img[^>]+src="([^">]+)"/)
      if (imgMatch) {
        return imgMatch[1]
      }
    }

    // 4. content with img tag
    if (item.content) {
      const imgMatch = item.content.match(/<img[^>]+src="([^">]+)"/)
      if (imgMatch) {
        return imgMatch[1]
      }
    }

    // 5. itunes:image (iTunes RSS)
    if (item.itunes?.image) {
      return item.itunes.image
    }

    // 6. Direct image property
    if (typeof item.image === 'string') {
      return item.image
    }

    return undefined
  }

  /**
   * Sanitize and validate image URL
   * SECURITY: Prevents javascript: and data: URLs that could execute XSS
   */
  private sanitizeImageUrl(url: string | undefined): string | undefined {
    if (!url) return undefined

    try {
      const parsed = new URL(url)
      // Only allow http and https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return undefined
      }
      return url
    } catch {
      // Invalid URL
      return undefined
    }
  }

  /**
   * Clean HTML and extract text content
   * SECURITY: Uses DOMPurify to sanitize HTML before extraction
   */
  private cleanHTML(html: string): string {
    // SECURITY: Sanitize HTML using DOMPurify (strips all tags)
    let text = sanitizeText(html)

    // Decode common HTML entities that might remain
    text = text.replace(/&nbsp;/g, ' ')
    text = text.trim()

    // Truncate to 500 characters for excerpt
    if (text.length > 500) {
      return text.substring(0, 497) + '...'
    }

    return text
  }
}
