import { prisma } from '@/config/prisma'
import { Prisma } from '@prisma/client'
import { CacheService, CacheKeys } from './cache.service'
import { PAGINATION_CONFIG } from '@/constants/pagination'
import { CACHE_TTL } from '@/constants/performance'
import { PlanLimiter } from '@/utils/plan-limiter'
import { DistributedLockService } from './distributed-lock.service'

export interface GetArticlesFilters {
  source?: string
  tags?: string
  search?: string
  dateRange?: '24h' | '7d' | '30d' | 'all'
  skip?: number
  take?: number
}

export interface CreateArticleData {
  title: string
  url: string
  excerpt: string
  imageUrl?: string
  source: string
  tags: string[]
  publishedAt: Date
}

export class ArticleService {
  /**
   * Get all articles with optional filters (for Veille page)
   */
  async getArticles(filters: GetArticlesFilters = {}) {
    const { source, tags, search, dateRange, skip = 0, take } = filters

    // Enforce pagination limits
    const limit = Math.min(
      take || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
      PAGINATION_CONFIG.MAX_PAGE_SIZE
    )

    // Generate cache key based on filters
    const cacheKey = `articles:list:${JSON.stringify({ source, tags, search, dateRange, skip, limit })}`

    // Try cache first
    const cached = await CacheService.get<{ articles: unknown[]; total: number }>(cacheKey)
    if (cached) {
      return cached
    }

    const where: Prisma.ArticleWhereInput = {}

    // Filter by source
    if (source) {
      where.source = source
    }

    // Filter by tags (comma-separated)
    if (tags) {
      const tagList = tags.split(',').map((t) => t.trim())
      where.tags = {
        hasSome: tagList,
      }
    }

    // Search in title or excerpt
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Filter by date range
    if (dateRange && dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case '24h':
          startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
          break
        case '7d':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case '30d':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
          break
        default:
          startDate = new Date(0) // All time
      }

      where.publishedAt = {
        gte: startDate,
      }
    }

    const [articles, total] = await Promise.all([
      prisma.article.findMany({
        where,
        select: {
          id: true,
          title: true,
          url: true,
          excerpt: true,
          imageUrl: true,
          source: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
        },
        orderBy: {
          publishedAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.article.count({ where }),
    ])

    const result = { articles, total }

    // Cache for 5 minutes (articles change slowly - RSS fetched hourly)
    await CacheService.set(cacheKey, result, CACHE_TTL.ARTICLES_LIST)

    return result
  }

  /**
   * Get user's saved articles with optional filters
   */
  async getUserSavedArticles(
    userId: string,
    filters: GetArticlesFilters = {}
  ) {
    const { source, skip = 0, take } = filters

    // Enforce pagination limits
    const limit = Math.min(
      take || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
      PAGINATION_CONFIG.MAX_PAGE_SIZE
    )

    const where: Prisma.SavedArticleWhereInput = {
      userId,
      ...(source && { article: { source } }),
    }

    return await prisma.savedArticle.findMany({
      where,
      include: {
        article: {
          select: {
            id: true,
            title: true,
            url: true,
            excerpt: true,
            imageUrl: true,
            source: true,
            tags: true,
            publishedAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      skip,
      take: limit,
    })
  }

  /**
   * Save an article for a user (with plan limits)
   * Uses distributed lock to prevent race condition with plan limit checks
   *
   * Race condition protection:
   * - Without lock: 2 concurrent requests → both pass limit check → user exceeds limit
   * - With lock: Only first request saves, second waits and gets proper limit check
   */
  async saveArticle(userId: string, articleId: string): Promise<void> {
    // Use distributed lock to ensure atomic limit check + save operation
    const result = await DistributedLockService.executeWithLock(
      `article-save-${userId}`,
      5000, // 5s TTL (enough for limit check + save)
      async () => {
        // Check plan limits using centralized utility
        await PlanLimiter.checkLimit(userId, 'article')

        // Save article
        await prisma.savedArticle.create({
          data: {
            userId,
            articleId,
          },
        })

        // Invalidate cache
        await PlanLimiter.invalidateCache(userId, 'article')
      }
    )

    // If lock couldn't be acquired, throw error (user should retry)
    if (result === null) {
      throw new Error('Unable to save article at this time. Please try again.')
    }
  }

  /**
   * Unsave an article for a user
   */
  async unsaveArticle(userId: string, articleId: string): Promise<void> {
    await prisma.savedArticle.deleteMany({
      where: {
        userId,
        articleId,
      },
    })

    // Decrement cache counter
    const cacheKey = CacheKeys.articleCount(userId)
    const currentCount = await CacheService.get<number>(cacheKey)
    if (currentCount !== null && currentCount > 0) {
      await CacheService.set(cacheKey, currentCount - 1, CACHE_TTL.ARTICLE_COUNT)
    }
  }

  /**
   * Create or update an article (used by RSS worker)
   */
  async upsertArticle(data: CreateArticleData) {
    return await prisma.article.upsert({
      where: { url: data.url },
      update: {},
      create: data,
    })
  }

  /**
   * Get list of unique article sources
   */
  async getSources(): Promise<string[]> {
    const sources = await prisma.article.groupBy({
      by: ['source'],
      _count: {
        source: true,
      },
      orderBy: {
        _count: {
          source: 'desc',
        },
      },
    })

    return sources.map((s) => s.source)
  }
}

// Export singleton instance
export const articleService = new ArticleService()
