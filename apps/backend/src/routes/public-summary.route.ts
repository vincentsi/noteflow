import type { FastifyInstance } from 'fastify'
import { summaryController } from '@/controllers/summary.controller'

/**
 * Public summary routes (no authentication required)
 * @param fastify - Fastify instance
 */
export async function publicSummaryRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * Get public summary by share token
   * @route GET /api/public/summaries/:token
   * @access Public
   */
  fastify.get(
    '/:token',
    {
      schema: {
        tags: ['Public'],
        description: 'Get a public summary by share token',
        params: {
          type: 'object',
          properties: {
            token: { type: 'string' },
          },
          required: ['token'],
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
    summaryController.getPublicSummary.bind(summaryController)
  )
}
