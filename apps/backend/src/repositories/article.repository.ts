import { prisma } from '@/config/prisma'
import type { Article, SavedArticle, Prisma } from '@prisma/client'
import { paginateQuery, type PaginatedResult } from '@/utils/generic-pagination'

/**
 * Article Repository
 *
 * Centralizes all Prisma queries for Articles and SavedArticles
 * Provides a clean abstraction layer between services and database
 *
 * Benefits:
 * - Single source of truth for queries
 * - Easier to test (mock repository instead of Prisma)
 * - Query reusability
 * - Consistent error handling
 *
 * @example
 * ```typescript
 * const articleRepo = new ArticleRepository()
 * const articles = await articleRepo.findAllArticles({ page: 1, limit: 20 })
 * ```
 */

export interface ArticleFilters {
  source?: string
  tags?: string[]
  searchQuery?: string
  publishedAfter?: Date
  publishedBefore?: Date
}

export interface SavedArticleFilters {
  userId: string
  createdAfter?: Date
  createdBefore?: Date
}

export class ArticleRepository {
  /**
   * Find all articles with pagination and filters
   */
  async findAllArticles(options: {
    page: number
    limit: number
    filters?: ArticleFilters
    orderBy?: Prisma.ArticleOrderByWithRelationInput
  }): Promise<PaginatedResult<Article>> {
    const { page, limit, filters, orderBy } = options

    // Build where clause from filters
    const where: Prisma.ArticleWhereInput = {}

    if (filters?.source) {
      where.source = filters.source
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags }
    }

    if (filters?.searchQuery) {
      where.OR = [
        { title: { contains: filters.searchQuery, mode: 'insensitive' } },
        { excerpt: { contains: filters.searchQuery, mode: 'insensitive' } },
      ]
    }

    if (filters?.publishedAfter || filters?.publishedBefore) {
      where.publishedAt = {}
      if (filters.publishedAfter) {
        where.publishedAt.gte = filters.publishedAfter
      }
      if (filters.publishedBefore) {
        where.publishedAt.lte = filters.publishedBefore
      }
    }

    return paginateQuery<Article>(prisma.article, {
      where,
      orderBy: orderBy || { publishedAt: 'desc' },
      page,
      limit,
    })
  }

  /**
   * Find article by ID
   */
  async findArticleById(id: string): Promise<Article | null> {
    return prisma.article.findUnique({
      where: { id },
    })
  }

  /**
   * Find article by URL
   */
  async findArticleByUrl(url: string): Promise<Article | null> {
    return prisma.article.findUnique({
      where: { url },
    })
  }

  /**
   * Create article
   */
  async createArticle(data: Prisma.ArticleCreateInput): Promise<Article> {
    return prisma.article.create({
      data,
    })
  }

  /**
   * Create article if it doesn't exist (upsert by URL)
   */
  async upsertArticle(data: Prisma.ArticleCreateInput): Promise<Article> {
    return prisma.article.upsert({
      where: { url: data.url },
      update: {
        title: data.title,
        excerpt: data.excerpt,
        imageUrl: data.imageUrl,
        source: data.source,
        tags: data.tags,
        publishedAt: data.publishedAt,
      },
      create: data,
    })
  }

  /**
   * Find user's saved articles with pagination
   */
  async findUserSavedArticles(options: {
    userId: string
    page: number
    limit: number
    filters?: Pick<ArticleFilters, 'source' | 'tags'>
  }): Promise<PaginatedResult<SavedArticle & { article: Article }>> {
    const { userId, page, limit, filters } = options

    // Build where clause
    const where: Prisma.SavedArticleWhereInput = {
      userId,
    }

    // Apply filters to nested article
    if (filters?.source || filters?.tags) {
      where.article = {}

      if (filters.source) {
        where.article.source = filters.source
      }

      if (filters.tags && filters.tags.length > 0) {
        where.article.tags = { hasSome: filters.tags }
      }
    }

    return paginateQuery<SavedArticle & { article: Article }>(prisma.savedArticle, {
      where,
      include: { article: true },
      orderBy: { createdAt: 'desc' },
      page,
      limit,
    })
  }

  /**
   * Check if user has saved an article
   */
  async isArticleSavedByUser(userId: string, articleId: string): Promise<boolean> {
    const savedArticle = await prisma.savedArticle.findUnique({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    })

    return savedArticle !== null
  }

  /**
   * Save article for user
   */
  async saveArticleForUser(userId: string, articleId: string): Promise<SavedArticle> {
    return prisma.savedArticle.create({
      data: {
        userId,
        articleId,
      },
    })
  }

  /**
   * Unsave article for user
   */
  async unsaveArticleForUser(userId: string, articleId: string): Promise<void> {
    await prisma.savedArticle.delete({
      where: {
        userId_articleId: {
          userId,
          articleId,
        },
      },
    })
  }

  /**
   * Count user's saved articles
   */
  async countUserSavedArticles(userId: string): Promise<number> {
    return prisma.savedArticle.count({
      where: { userId },
    })
  }

  /**
   * Get unique article sources
   */
  async getUniqueSources(): Promise<string[]> {
    const articles = await prisma.article.findMany({
      select: { source: true },
      distinct: ['source'],
      orderBy: { source: 'asc' },
    })

    return articles.map(a => a.source)
  }

  /**
   * Get all unique tags across articles
   */
  async getUniqueTags(): Promise<string[]> {
    const articles = await prisma.article.findMany({
      select: { tags: true },
    })

    // Flatten and deduplicate tags
    const allTags = articles.flatMap(a => a.tags)
    return Array.from(new Set(allTags)).sort()
  }

  /**
   * Delete old articles (cleanup)
   */
  async deleteArticlesOlderThan(date: Date): Promise<number> {
    const result = await prisma.article.deleteMany({
      where: {
        publishedAt: { lt: date },
      },
    })

    return result.count
  }
}

// Export singleton instance
export const articleRepository = new ArticleRepository()
