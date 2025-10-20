// CRITICAL: Import prismaMock BEFORE other imports
import { prismaMock } from '../../helpers/test-db'
import { processRSSFeeds } from '../../../queues/rss.worker'
import { RSSService } from '../../../services/rss.service'
import { PlanType } from '@prisma/client'

// Mock RSSService
jest.mock('../../../services/rss.service')

describe('RSS Worker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch and store articles from active feeds', async () => {
    const mockFeeds = [
      {
        id: 'feed-1',
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed',
        description: 'Tech news',
        tags: ['tech', 'ai'],
        active: true,
        lastFetchAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const mockArticles = [
      {
        title: 'New Article',
        url: 'https://example.com/new',
        excerpt: 'Test excerpt',
        publishedAt: new Date('2024-01-01'),
        source: 'TechCrunch',
      },
    ]

    prismaMock.rSSFeed.findMany.mockResolvedValue(mockFeeds)
    ;(RSSService.prototype.parseFeed as jest.Mock).mockResolvedValue(mockArticles)

    prismaMock.article.upsert.mockResolvedValue({
      id: 'article-1',
      title: 'New Article',
      url: 'https://example.com/new',
      excerpt: 'Test excerpt',
      source: 'TechCrunch',
      tags: ['tech', 'ai'],
      publishedAt: new Date('2024-01-01'),
      createdAt: new Date(),
    })

    prismaMock.rSSFeed.update.mockResolvedValue({
      ...mockFeeds[0],
      lastFetchAt: new Date(),
    })

    await processRSSFeeds(prismaMock as any)

    expect(prismaMock.rSSFeed.findMany).toHaveBeenCalledWith({
      where: { active: true },
    })

    expect(RSSService.prototype.parseFeed).toHaveBeenCalledWith(
      'https://techcrunch.com/feed'
    )

    expect(prismaMock.article.upsert).toHaveBeenCalledWith({
      where: { url: 'https://example.com/new' },
      update: {},
      create: {
        title: 'New Article',
        url: 'https://example.com/new',
        excerpt: 'Test excerpt',
        source: 'TechCrunch',
        tags: ['tech', 'ai'],
        publishedAt: mockArticles[0].publishedAt,
      },
    })

    expect(prismaMock.rSSFeed.update).toHaveBeenCalledWith({
      where: { id: 'feed-1' },
      data: { lastFetchAt: expect.any(Date) },
    })
  })

  it('should only process active feeds', async () => {
    const mockFeeds = [
      {
        id: 'feed-1',
        name: 'Active Feed',
        url: 'https://active.com/feed',
        description: 'Active',
        tags: ['tech'],
        active: true,
        lastFetchAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    prismaMock.rSSFeed.findMany.mockResolvedValue(mockFeeds)
    ;(RSSService.prototype.parseFeed as jest.Mock).mockResolvedValue([])

    prismaMock.rSSFeed.update.mockResolvedValue({
      ...mockFeeds[0],
      lastFetchAt: new Date(),
    })

    await processRSSFeeds(prismaMock as any)

    expect(prismaMock.rSSFeed.findMany).toHaveBeenCalledWith({
      where: { active: true },
    })
  })

  it('should continue processing other feeds if one fails', async () => {
    const mockFeeds = [
      {
        id: 'feed-1',
        name: 'Failing Feed',
        url: 'https://failing.com/feed',
        description: 'Will fail',
        tags: ['tech'],
        active: true,
        lastFetchAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'feed-2',
        name: 'Working Feed',
        url: 'https://working.com/feed',
        description: 'Will work',
        tags: ['dev'],
        active: true,
        lastFetchAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]

    const mockArticles = [
      {
        title: 'Article from working feed',
        url: 'https://example.com/article',
        excerpt: 'Test',
        publishedAt: new Date(),
        source: 'Working Feed',
      },
    ]

    prismaMock.rSSFeed.findMany.mockResolvedValue(mockFeeds)

    // First call fails, second succeeds
    ;(RSSService.prototype.parseFeed as jest.Mock)
      .mockRejectedValueOnce(new Error('Failed to parse RSS feed'))
      .mockResolvedValueOnce(mockArticles)

    prismaMock.article.upsert.mockResolvedValue({
      id: 'article-1',
      title: 'Article from working feed',
      url: 'https://example.com/article',
      excerpt: 'Test',
      source: 'Working Feed',
      tags: ['dev'],
      publishedAt: new Date(),
      createdAt: new Date(),
    })

    prismaMock.rSSFeed.update.mockResolvedValue({
      ...mockFeeds[1],
      lastFetchAt: new Date(),
    })

    await processRSSFeeds(prismaMock as any)

    // Should have called parseFeed for both feeds
    expect(RSSService.prototype.parseFeed).toHaveBeenCalledTimes(2)

    // Should have upserted article from working feed
    expect(prismaMock.article.upsert).toHaveBeenCalled()

    // Should only update lastFetchAt for working feed
    expect(prismaMock.rSSFeed.update).toHaveBeenCalledTimes(1)
    expect(prismaMock.rSSFeed.update).toHaveBeenCalledWith({
      where: { id: 'feed-2' },
      data: { lastFetchAt: expect.any(Date) },
    })
  })
})
