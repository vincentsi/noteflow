import { prisma } from '@/config/prisma'
import { Prisma, PlanType } from '@prisma/client'
import { CacheService } from './cache.service'
import { ARTICLE_LIMITS } from '@/constants/plan-limits'

const DEFAULT_PAGE_SIZE = 20
const MAX_PAGE_SIZE = 100
const ARTICLE_COUNT_CACHE_TTL = 3600 // 1 hour

export interface GetArticlesFilters {
  source?: string
  skip?: number
  take?: number
}

export interface CreateArticleData {
  title: string
  url: string
  excerpt: string
  source: string
  tags: string[]
  publishedAt: Date
}

export class ArticleService {
  /**
   * Get user's saved articles with optional filters
   */
  async getUserSavedArticles(
    userId: string,
    filters: GetArticlesFilters = {}
  ) {
    const { source, skip = 0, take } = filters

    // Enforce pagination limits
    const limit = Math.min(take || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE)

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
            source: true,
            tags: true,
            publishedAt: true,
            // Exclude large fields: originalText and summaryText
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
        await CacheService.set(cacheKey, currentCount, ARTICLE_COUNT_CACHE_TTL)
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
    await CacheService.increment(cacheKey, ARTICLE_COUNT_CACHE_TTL)
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
      await CacheService.set(cacheKey, currentCount - 1, ARTICLE_COUNT_CACHE_TTL)
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
}
