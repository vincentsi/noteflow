import Parser from 'rss-parser'

export interface ParsedArticle {
  title: string
  url: string
  excerpt: string
  imageUrl?: string
  publishedAt: Date
  source: string
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
      const feed = await this.parser.parseURL(url)

      const articles: ParsedArticle[] = feed.items.map((item) => ({
        title: item.title || 'Untitled',
        url: item.link || item.guid || '',
        excerpt: this.cleanHTML(item.contentSnippet || item.content || ''),
        imageUrl: this.extractImageUrl(item),
        publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        source: feed.title || 'Unknown Source',
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
  private extractImageUrl(item: any): string | undefined {
    // Try common image fields in order of preference
    // 1. enclosure with image type (common in podcasts and media RSS)
    if (item.enclosure?.url && item.enclosure?.type?.startsWith('image/')) {
      return item.enclosure.url
    }

    // 2. media:content or media:thumbnail (Media RSS specification)
    if (item['media:content']?.$ ?.url) {
      return item['media:content'].$.url
    }
    if (item['media:thumbnail']?.$ ?.url) {
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

  private cleanHTML(html: string): string {
    let text = html.replace(/<[^>]*>/g, '')
    text = text.replace(/&nbsp;/g, ' ')
    text = text.replace(/&amp;/g, '&')
    text = text.replace(/&lt;/g, '<')
    text = text.replace(/&gt;/g, '>')
    text = text.replace(/&quot;/g, '"')
    text = text.trim()

    if (text.length > 500) {
      return text.substring(0, 497) + '...'
    }

    return text
  }
}
