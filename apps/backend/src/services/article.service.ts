import { prisma } from '@/config/prisma'
import { Prisma } from '@prisma/client'
import { CacheService, CacheKeys } from './cache.service'
import { CACHE_TTL } from '@/constants/performance'
import { PlanLimiter } from '@/utils/plan-limiter'
import { DistributedLockService } from './distributed-lock.service'
import { buildCacheKey, buildDateRange, buildTagsFilter } from '@/utils/query-builders'
import {
  paginationToSkipTake,
  calculatePagination,
  type PaginationParams,
} from '@/types/pagination'

export interface GetArticlesFilters {
  source?: string
  tags?: string
  search?: string
  dateRange?: '24h' | '7d' | '30d' | 'all'
  pagination?: PaginationParams
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
    const { source, tags, search, dateRange } = filters

    // Build pagination options
    const { skip, take } = paginationToSkipTake(filters.pagination)

    // Generate cache key based on filters
    const cacheKey = buildCacheKey('articles:list', {
      source,
      tags,
      search,
      dateRange,
      skip,
      take,
    })

    // Try cache first with version check (PERF-004)
    const { data: cached, version } = await CacheService.getWithVersion<{
      articles: unknown[]
      pagination: ReturnType<typeof calculatePagination>
    }>(cacheKey)
    if (cached) {
      return cached
    }

    // Build WHERE clause
    const where: Prisma.ArticleWhereInput = {}

    if (source) {
      where.source = source
    }

    const tagsFilter = buildTagsFilter(tags)
    if (tagsFilter) {
      where.tags = tagsFilter.tags
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ]
    }

    const dateFilter = buildDateRange(dateRange, 'publishedAt')
    if (dateFilter) {
      where.publishedAt = dateFilter.publishedAt
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
        take,
      }),
      prisma.article.count({ where }),
    ])

    const result = {
      articles,
      pagination: calculatePagination(total, filters.pagination ?? {}),
    }

    // Cache for 5 minutes with version check (PERF-004)
    // Only cache if version hasn't changed (prevents stale data)
    await CacheService.setWithVersion(cacheKey, result, version, CACHE_TTL.ARTICLES_LIST)

    return result
  }

  /**
   * Get user's saved articles with optional filters
   */
  async getUserSavedArticles(userId: string, filters: GetArticlesFilters = {}) {
    const { source } = filters

    // Build pagination options
    const { skip, take } = paginationToSkipTake(filters.pagination)

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
      take,
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
    const article = await prisma.article.upsert({
      where: { url: data.url },
      update: {},
      create: data,
    })

    // Invalidate all article list caches (PERF-004)
    // Increment version for all possible article list queries
    await CacheService.invalidateVersion('articles:list')

    return article
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

    return sources.map(s => s.source)
  }
}

// Export singleton instance
export const articleService = new ArticleService()
