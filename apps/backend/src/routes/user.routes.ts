import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { createProtectedRoutes } from '@/utils/protected-routes'
import { prisma } from '@/config/prisma'
import { SuccessResponse, ErrorResponse } from '@/utils/response-builders'
import { ARTICLE_LIMITS, SUMMARY_LIMITS, NOTE_LIMITS } from '@/constants/plan-limits'

/**
 * Update Profile Request Schema
 */
interface UpdateProfileBody {
  name?: string
  language?: string
}

/**
 * User routes
 * @param fastify - Fastify instance
 */
export const userRoutes = createProtectedRoutes(async (fastify: FastifyInstance): Promise<void> => {
  /**
   * Update current user profile
   * @route PATCH /api/users/me
   * @access Private
   */
  fastify.patch<{
    Body: UpdateProfileBody
  }>(
    '/me',
    {
      schema: {
        tags: ['Users'],
        description: 'Update current user profile',
        body: {
          type: 'object',
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            language: { type: 'string', enum: ['fr', 'en'] },
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
                  user: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      email: { type: 'string' },
                      name: { type: ['string', 'null'] },
                      language: { type: 'string' },
                      role: { type: 'string' },
                      emailVerified: { type: 'boolean' },
                      planType: { type: 'string' },
                      subscriptionStatus: { type: 'string' },
                      createdAt: { type: 'string' },
                      updatedAt: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: UpdateProfileBody }>, reply: FastifyReply) => {
      try {
        const userId = request.user?.userId

        if (!userId) {
          return reply.status(401).send(ErrorResponse.unauthorized())
        }

        const { name, language } = request.body

        // Validate language if provided
        if (language && !['fr', 'en'].includes(language)) {
          return reply
            .status(400)
            .send(ErrorResponse.badRequest('Invalid language. Must be "fr" or "en"'))
        }

        // Build update object (only include fields that are provided)
        const updateData: { name?: string; language?: string } = {}
        if (name !== undefined) updateData.name = name
        if (language !== undefined) updateData.language = language

        // Update user in database
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: updateData,
          select: {
            id: true,
            email: true,
            name: true,
            language: true,
            role: true,
            emailVerified: true,
            planType: true,
            subscriptionStatus: true,
            createdAt: true,
            updatedAt: true,
          },
        })

        return reply.status(200).send(SuccessResponse.ok({ user: updatedUser }))
      } catch (error) {
        request.log.error(error, 'Failed to update user profile')
        return reply.status(500).send(ErrorResponse.internalError('Failed to update profile'))
      }
    }
  )

  /**
   * Get current user stats (usage and limits)
   * @route GET /api/users/stats
   * @access Private
   */
  fastify.get(
    '/stats',
    {
      schema: {
        tags: ['Users'],
        description: 'Get user usage statistics and plan limits',
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  stats: {
                    type: 'object',
                    properties: {
                      articles: {
                        type: 'object',
                        properties: {
                          current: { type: 'number' },
                          limit: { type: ['number', 'null'] },
                        },
                      },
                      summaries: {
                        type: 'object',
                        properties: {
                          current: { type: 'number' },
                          limit: { type: ['number', 'null'] },
                        },
                      },
                      notes: {
                        type: 'object',
                        properties: {
                          current: { type: 'number' },
                          limit: { type: ['number', 'null'] },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          401: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const userId = request.user?.userId

        if (!userId) {
          return reply.status(401).send(ErrorResponse.unauthorized())
        }

        // Get user's plan type
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { planType: true },
        })

        if (!user) {
          return reply.status(404).send(ErrorResponse.notFound('User not found'))
        }

        // Get start of current month for summaries count
        const now = new Date()
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

        // Count usage
        const [articlesCount, summariesCount, notesCount] = await Promise.all([
          prisma.savedArticle.count({ where: { userId } }),
          prisma.summary.count({
            where: {
              userId,
              createdAt: { gte: startOfMonth },
            },
          }),
          prisma.note.count({ where: { userId } }),
        ])

        // Get limits based on plan (convert Infinity to null for JSON)
        const articleLimit = ARTICLE_LIMITS[user.planType]
        const summaryLimit = SUMMARY_LIMITS[user.planType]
        const noteLimit = NOTE_LIMITS[user.planType]

        const stats = {
          articles: {
            current: articlesCount,
            limit: articleLimit === Infinity ? null : articleLimit,
          },
          summaries: {
            current: summariesCount,
            limit: summaryLimit === Infinity ? null : summaryLimit,
          },
          notes: {
            current: notesCount,
            limit: noteLimit === Infinity ? null : noteLimit,
          },
        }

        return reply.status(200).send(SuccessResponse.ok({ stats }))
      } catch (error) {
        request.log.error(error, 'Failed to get user stats')
        return reply.status(500).send(ErrorResponse.internalError('Failed to get stats'))
      }
    }
  )
})
