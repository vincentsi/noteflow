import type { FastifyRequest, FastifyReply } from 'fastify'
import { articleService } from '@/services/article.service'
import {
  getArticlesSchema,
  getSavedArticlesSchema,
  saveArticleSchema,
  unsaveArticleSchema,
} from '@/schemas/article.schema'
import { handleControllerError } from '@/utils/error-response'
import { requireAuth } from '@/utils/require-auth'
import { createAuthQueryHandler } from '@/utils/controller-wrapper'

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

      // Get articles with pagination
      const { articles, pagination } = await articleService.getArticles(filters)

      return reply.status(200).send({
        success: true,
        data: articles,
        pagination,
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
      const userId = requireAuth(request)
      const filters = getSavedArticlesSchema.parse(request.query)
      const result = await articleService.getUserSavedArticles(userId, filters)

      return reply.status(200).send({
        success: true,
        data: result.savedArticles,
        pagination: result.pagination,
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
      const userId = requireAuth(request)
      const { articleId } = request.params as { articleId: string }
      saveArticleSchema.parse({ articleId })
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
      const userId = requireAuth(request)
      const { articleId } = request.params as { articleId: string }
      unsaveArticleSchema.parse({ articleId })
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
