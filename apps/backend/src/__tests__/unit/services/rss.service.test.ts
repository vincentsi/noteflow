import { RSSService } from '@/services/rss.service'

describe('RSSService', () => {
  let rssService: RSSService

  beforeEach(() => {
    rssService = new RSSService()
  })

  describe('parseFeed', () => {
    it('should parse RSS feed and return articles', async () => {
      // Note: This test uses a real RSS feed URL
      // In production, you might want to mock this
      const feedUrl = 'https://hnrss.org/newest?count=5'

      const articles = await rssService.parseFeed(feedUrl)

      expect(articles).toBeDefined()
      expect(Array.isArray(articles)).toBe(true)
      expect(articles.length).toBeGreaterThan(0)

      // Check first article structure
      const article = articles[0]
      expect(article).toHaveProperty('title')
      expect(article).toHaveProperty('url')
      expect(article).toHaveProperty('excerpt')
      expect(article).toHaveProperty('publishedAt')
      expect(article).toHaveProperty('source')

      expect(typeof article.title).toBe('string')
      expect(typeof article.url).toBe('string')
      expect(typeof article.excerpt).toBe('string')
      expect(article.publishedAt).toBeInstanceOf(Date)
      expect(typeof article.source).toBe('string')
    })

    it('should clean HTML from excerpts', async () => {
      const feedUrl = 'https://hnrss.org/newest?count=1'

      const articles = await rssService.parseFeed(feedUrl)

      // Excerpt should not contain HTML tags
      expect(articles[0].excerpt).not.toMatch(/<[^>]*>/)
    })

    it('should limit excerpt to 500 characters', async () => {
      const feedUrl = 'https://hnrss.org/newest?count=5'

      const articles = await rssService.parseFeed(feedUrl)

      articles.forEach((article) => {
        expect(article.excerpt.length).toBeLessThanOrEqual(500)
      })
    })
  })
})
