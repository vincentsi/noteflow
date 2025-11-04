import type { FastifyInstance } from 'fastify'
import { articleController } from '@/controllers/article.controller'
import { env } from '@/config/env'
import { standardResponses, errorResponse } from '@/schemas/common-responses.schema'
import { rateLimitPresets } from '@/utils/rate-limit-configs'
import { authMiddleware } from '@/middlewares/auth.middleware'

/**
 * Article routes
 * @param fastify - Fastify instance
 */
export async function articleRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get all articles (for Veille page)
   * @route GET /api/articles
   * @access Public (allow non-authenticated users to browse)
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Articles'],
        description: 'Get all articles with optional filters',
        querystring: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            tags: { type: 'string', description: 'Comma-separated tags' },
            search: { type: 'string' },
            dateRange: { type: 'string', enum: ['24h', '7d', '30d', 'all'] },
            skip: { type: 'number', minimum: 0 },
            take: { type: 'number', minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    title: { type: 'string' },
                    url: { type: 'string' },
                    excerpt: { type: 'string' },
                    imageUrl: { type: 'string', nullable: true },
                    source: { type: 'string' },
                    tags: { type: 'array', items: { type: 'string' } },
                    publishedAt: { type: 'string' },
                    createdAt: { type: 'string' },
                  },
                },
              },
              total: { type: 'number' },
            },
          },
        },
      },
    },
    articleController.getArticles.bind(articleController)
  )

  /**
   * Get article sources
   * @route GET /api/articles/sources
   * @access Public (allow non-authenticated users to browse)
   */
  fastify.get(
    '/sources',
    {
      schema: {
        tags: ['Articles'],
        description: 'Get list of unique article sources',
        response: standardResponses({
          type: 'array',
          items: { type: 'string' },
        }),
      },
    },
    articleController.getSources.bind(articleController)
  )

  /**
   * Get saved articles
   * @route GET /api/articles/saved
   * @access Private
   */
  fastify.get(
    '/saved',
    {
      preHandler: authMiddleware,
      schema: {
        tags: ['Articles'],
        description: 'Get user saved articles with optional filters',
        querystring: {
          type: 'object',
          properties: {
            source: { type: 'string' },
            skip: { type: 'number', minimum: 0 },
            take: { type: 'number', minimum: 1, maximum: 100 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    userId: { type: 'string' },
                    articleId: { type: 'string' },
                    createdAt: { type: 'string' },
                    article: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' },
                        url: { type: 'string' },
                        excerpt: { type: 'string' },
                        imageUrl: { type: 'string', nullable: true },
                        source: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } },
                        publishedAt: { type: 'string' },
                        createdAt: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    articleController.getSavedArticles.bind(articleController)
  )

  /**
   * Save an article
   * @route POST /api/articles/:articleId/save
   * @access Private
   * @rateLimit 60 requests/hour per user (prevents abuse)
   */
  fastify.post(
    '/:articleId/save',
    {
      preHandler: authMiddleware,
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: rateLimitPresets.articleSave,
            }
          : {},
      schema: {
        tags: ['Articles'],
        description: 'Save an article for the user',
        params: {
          type: 'object',
          properties: {
            articleId: { type: 'string' },
          },
          required: ['articleId'],
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
          403: errorResponse,
        },
      },
    },
    articleController.saveArticle.bind(articleController)
  )

  /**
   * Unsave an article
   * @route DELETE /api/articles/:articleId/unsave
   * @access Private
   * @rateLimit 60 requests/hour per user (prevents abuse)
   */
  fastify.delete(
    '/:articleId/unsave',
    {
      preHandler: authMiddleware,
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: rateLimitPresets.articleUnsave,
            }
          : {},
      schema: {
        tags: ['Articles'],
        description: 'Unsave an article for the user',
        params: {
          type: 'object',
          properties: {
            articleId: { type: 'string' },
          },
          required: ['articleId'],
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    articleController.unsaveArticle.bind(articleController)
  )
}
