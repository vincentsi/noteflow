import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { authMiddleware } from '@/middlewares/auth.middleware'
import { prisma } from '@/config/prisma'
import { SuccessResponse, ErrorResponse } from '@/utils/response-builders'

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
export async function userRoutes(fastify: FastifyInstance): Promise<void> {
  // Add authentication middleware to all routes
  fastify.addHook('preHandler', authMiddleware)

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
          return reply.status(400).send(ErrorResponse.badRequest('Invalid language. Must be "fr" or "en"'))
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
}
