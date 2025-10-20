import { prisma } from '@/config/prisma'
import { Prisma, PlanType } from '@prisma/client'

const PLAN_LIMITS = {
  FREE: 10,
  STARTER: 50,
  PRO: Infinity,
} as const

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
    const { source, skip, take } = filters

    const where: Prisma.SavedArticleWhereInput = {
      userId,
      ...(source && { article: { source } }),
    }

    return await prisma.savedArticle.findMany({
      where,
      include: {
        article: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      ...(skip !== undefined && { skip }),
      ...(take !== undefined && { take }),
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
      const currentCount = await prisma.savedArticle.count({
        where: { userId },
      })

      const limit = PLAN_LIMITS[user.planType]

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
