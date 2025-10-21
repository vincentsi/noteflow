import type { FastifyInstance } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { summaryController } from '@/controllers/summary.controller'

/**
 * Summary routes
 * @param fastify - Fastify instance
 */
export async function summaryRoutes(fastify: FastifyInstance): Promise<void> {
  // Add authentication middleware to all routes
  fastify.addHook('preHandler', authMiddleware)

  /**
   * Create a summary
   * @route POST /api/summaries
   * @access Private
   */
  fastify.post(
    '/',
    {
      schema: {
        tags: ['Summaries'],
        description: 'Create a new summary generation job',
        body: {
          type: 'object',
          properties: {
            text: { type: 'string', minLength: 10 },
            style: {
              type: 'string',
              enum: [
                'SHORT',
                'TWEET',
                'THREAD',
                'BULLET_POINT',
                'TOP3',
                'MAIN_POINTS',
              ],
            },
            language: { type: 'string', enum: ['fr', 'en'] },
          },
          required: ['text', 'style'],
        },
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
}
