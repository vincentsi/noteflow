import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { articleController } from '@/controllers/article.controller'

/**
 * Article routes
 * @param fastify - Fastify instance
 */
export async function articleRoutes(fastify: FastifyInstance): Promise<void> {
  // Add authentication middleware to all routes
  fastify.addHook('preHandler', authMiddleware)

  /**
   * Get all articles (for Veille page)
   * @route GET /api/articles
   * @access Private
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
   * @access Private
   */
  fastify.get(
    '/sources',
    {
      schema: {
        tags: ['Articles'],
        description: 'Get list of unique article sources',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
        },
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
   */
  fastify.post(
    '/:articleId/save',
    {
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
          403: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    articleController.saveArticle.bind(articleController)
  )

  /**
   * Unsave an article
   * @route DELETE /api/articles/:articleId/unsave
   * @access Private
   */
  fastify.delete(
    '/:articleId/unsave',
    {
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
