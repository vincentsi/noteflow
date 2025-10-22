import { prisma } from '@/config/prisma'
import { Prisma, PlanType } from '@prisma/client'
import { CacheService } from './cache.service'
import { ARTICLE_LIMITS } from '@/constants/plan-limits'
import { PAGINATION_CONFIG } from '@/constants/pagination'
import { CACHE_TTL } from '@/constants/performance'

export interface GetArticlesFilters {
  source?: string
  tags?: string
  search?: string
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
    const { source, tags, search, skip = 0, take } = filters

    // Enforce pagination limits
    const limit = Math.min(
      take || PAGINATION_CONFIG.DEFAULT_PAGE_SIZE,
      PAGINATION_CONFIG.MAX_PAGE_SIZE
    )

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

    return { articles, total }
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
   */
  async saveArticle(userId: string, articleId: string): Promise<void> {
    // Get user's plan type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check plan limits (PRO = unlimited)
    if (user.planType !== PlanType.PRO) {
      const cacheKey = `article-count:${userId}`

      // Try to get count from cache
      let currentCount = await CacheService.get<number>(cacheKey)

      if (currentCount === null) {
        // Cache miss - count from database
        currentCount = await prisma.savedArticle.count({
          where: { userId },
        })

        // Cache for 1 hour
        await CacheService.set(cacheKey, currentCount, CACHE_TTL.ARTICLE_COUNT)
      }

      const limit = ARTICLE_LIMITS[user.planType]

      if (currentCount >= limit) {
        throw new Error(
          `Article save limit reached. Your ${user.planType} plan allows ${limit} saved articles.`
        )
      }
    }

    // Save article
    await prisma.savedArticle.create({
      data: {
        userId,
        articleId,
      },
    })

    // Increment cache counter
    const cacheKey = `article-count:${userId}`
    await CacheService.increment(cacheKey, CACHE_TTL.ARTICLE_COUNT)
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
    const cacheKey = `article-count:${userId}`
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
