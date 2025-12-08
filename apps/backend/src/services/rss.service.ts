import Parser from 'rss-parser'
import { validateUrlForFetch } from '@/utils/url-validator'
import { sanitizeText } from '@/utils/sanitize'

export interface ParsedArticle {
  title: string
  url: string
  excerpt: string
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
