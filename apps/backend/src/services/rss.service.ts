import Parser from 'rss-parser'

export interface ParsedArticle {
  title: string
  url: string
  excerpt: string
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
