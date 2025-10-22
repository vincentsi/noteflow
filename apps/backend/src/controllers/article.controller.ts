import type { FastifyRequest, FastifyReply } from 'fastify'
import { ArticleService } from '@/services/article.service'
import {
  getArticlesSchema,
  getSavedArticlesSchema,
  saveArticleSchema,
  unsaveArticleSchema,
  type GetArticlesDTO,
  type GetSavedArticlesDTO,
} from '@/schemas/article.schema'
import { handleControllerError } from '@/utils/error-response'

const articleService = new ArticleService()

/**
 * Article controller
 * Handles article-related routes
 */
export class ArticleController {
  /**
   * GET /api/articles
   * Get all articles with optional filters (for Veille page)
   */
  async getArticles(request: FastifyRequest, reply: FastifyReply) {
    try {
      // Validate query parameters
      const filters = getArticlesSchema.parse(request.query)

      // Get articles with total count
      const { articles, total } = await articleService.getArticles(filters)

      return reply.status(200).send({
        success: true,
        data: articles,
        total,
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/articles/sources
   * Get list of unique article sources
   */
  async getSources(request: FastifyRequest, reply: FastifyReply) {
    try {
      const sources = await articleService.getSources()

      return reply.status(200).send({
        success: true,
        data: sources,
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/articles/saved
   * Get user's saved articles with optional filters
   */
  async getSavedArticles(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate query parameters
      const filters = getSavedArticlesSchema.parse(request.query)

      // Get saved articles
      const savedArticles = await articleService.getUserSavedArticles(
        userId,
        filters
      )

      return reply.status(200).send({
        success: true,
        data: savedArticles,
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * POST /api/articles/:articleId/save
   * Save an article for the user
   */
  async saveArticle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const { articleId } = request.params as { articleId: string }

      // Validate articleId
      saveArticleSchema.parse({ articleId })

      // Save article
      await articleService.saveArticle(userId, articleId)

      return reply.status(201).send({
        success: true,
        message: 'Article saved successfully',
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Article save limit reached': (err, reply) => {
          return reply.status(403).send({
            success: false,
            error: 'Plan limit reached',
            message: err.message,
          })
        },
      })
    }
  }

  /**
   * DELETE /api/articles/:articleId/unsave
   * Unsave an article for the user
   */
  async unsaveArticle(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const { articleId } = request.params as { articleId: string }

      // Validate articleId
      unsaveArticleSchema.parse({ articleId })

      // Unsave article
      await articleService.unsaveArticle(userId, articleId)

      return reply.status(200).send({
        success: true,
        message: 'Article unsaved successfully',
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }
}

export const articleController = new ArticleController()
