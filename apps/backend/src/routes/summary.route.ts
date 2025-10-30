import type { FastifyInstance } from 'fastify'
import { createProtectedRoutes } from '@/utils/protected-routes'
import { summaryController } from '@/controllers/summary.controller'
import { env } from '@/config/env'

/**
 * Summary routes
 * @param fastify - Fastify instance
 */
export const summaryRoutes = createProtectedRoutes(
  async (fastify: FastifyInstance): Promise<void> => {
    /**
     * Create a summary
     * @route POST /api/summaries
     * @access Private
     * @rateLimit 10 requests/15 minutes per user (prevents OpenAI API abuse)
     */
    fastify.post(
      '/',
      {
        config:
          env.NODE_ENV !== 'test'
            ? {
                rateLimit: {
                  max: env.NODE_ENV === 'production' ? 10 : 100,
                  timeWindow: '15 minutes',
                  keyGenerator: request => {
                    const userId = request.user?.userId || 'anonymous'
                    return `summary:create:${userId}`
                  },
                  errorResponseBuilder: () => ({
                    statusCode: 429,
                    error: 'Too Many Requests',
                    message:
                      'You have reached the summary generation limit. Please try again in 15 minutes.',
                  }),
                },
              }
            : {},
        schema: {
          tags: ['Summaries'],
          description:
            'Create a new summary generation job (supports JSON or multipart/form-data for PDF uploads)',
          // No body schema validation - handle both JSON and multipart in controller
          response: {
            202: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    jobId: { type: 'string' },
                    message: { type: 'string' },
                  },
                },
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
      summaryController.createSummary.bind(summaryController)
    )

    /**
     * Get summary job status
     * @route GET /api/summaries/:jobId/status
     * @access Private
     */
    fastify.get(
      '/:jobId/status',
      {
        schema: {
          tags: ['Summaries'],
          description: 'Get summary job status',
          params: {
            type: 'object',
            properties: {
              jobId: { type: 'string' },
            },
            required: ['jobId'],
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    status: { type: 'string' },
                    jobId: { type: 'string' },
                    summary: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                },
              },
            },
            404: {
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
      summaryController.getSummaryStatus.bind(summaryController)
    )

    /**
     * Get a single summary by ID
     * @route GET /api/summaries/:id
     * @access Private
     */
    fastify.get(
      '/:id',
      {
        schema: {
          tags: ['Summaries'],
          description: 'Get a single summary by ID',
          params: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    summary: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                },
              },
            },
            404: {
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
      summaryController.getSummaryById.bind(summaryController)
    )

    /**
     * Get user summaries
     * @route GET /api/summaries
     * @access Private
     */
    fastify.get(
      '/',
      {
        schema: {
          tags: ['Summaries'],
          description: 'Get user summaries with pagination',
          querystring: {
            type: 'object',
            properties: {
              page: { type: 'number', minimum: 1, default: 1 },
              limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
            },
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                data: {
                  type: 'object',
                  properties: {
                    summaries: {
                      type: 'array',
                      items: {
                        type: 'object',
                        additionalProperties: true,
                      },
                    },
                    pagination: {
                      type: 'object',
                      properties: {
                        page: { type: 'number' },
                        limit: { type: 'number' },
                        total: { type: 'number' },
                        totalPages: { type: 'number' },
                        totalThisMonth: { type: 'number' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      summaryController.getUserSummaries.bind(summaryController)
    )

    /**
     * Delete a summary
     * @route DELETE /api/summaries/:id
     * @access Private
     */
    fastify.delete(
      '/:id',
      {
        schema: {
          tags: ['Summaries'],
          description: 'Delete a summary by ID',
          params: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
          response: {
            200: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                message: { type: 'string' },
              },
            },
            401: {
              type: 'object',
              properties: {
                success: { type: 'boolean' },
                error: { type: 'string' },
                message: { type: 'string' },
              },
            },
            404: {
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
      summaryController.deleteSummary.bind(summaryController)
    )
  }
)
