import type { FastifyInstance } from 'fastify'
import { createProtectedRoutes } from '@/utils/protected-routes'
import { templateController } from '@/controllers/template.controller'
import { env } from '@/config/env'
import {
  createResponses,
  standardResponses,
  errorResponse,
} from '@/schemas/common-responses.schema'
import { rateLimitPresets } from '@/utils/rate-limit-configs'

/**
 * Template routes
 * @param fastify - Fastify instance
 */
export const templateRoutes = createProtectedRoutes(
  async (fastify: FastifyInstance): Promise<void> => {
    /**
     * Create a custom template
     * @route POST /api/templates
     * @access Private
     * @rateLimit 30 requests/hour per user (prevents abuse)
     */
    fastify.post(
      '/',
      {
        bodyLimit: 1024 * 10, // 10KB max for template data
        config:
          env.NODE_ENV !== 'test'
            ? {
                rateLimit: {
                  max: env.NODE_ENV === 'production' ? 30 : 100,
                  timeWindow: '1 hour',
                  keyGenerator: request => {
                    const userId = request.user?.userId || 'anonymous'
                    return `template:create:${userId}`
                  },
                },
              }
            : {},
        schema: {
          tags: ['Templates'],
          description: 'Create a new custom summary template',
          body: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
                description: 'Template name',
              },
              description: {
                type: 'string',
                maxLength: 500,
                description: 'Optional template description',
              },
              prompt: {
                type: 'string',
                minLength: 10,
                maxLength: 2000,
                description: 'Custom AI prompt instructions',
              },
              icon: {
                type: 'string',
                maxLength: 10,
                description: 'Optional emoji or icon',
              },
            },
            required: ['name', 'prompt'],
          },
          response: {
            ...createResponses({ type: 'object', additionalProperties: true }),
            403: errorResponse,
          },
        },
      },
      templateController.createTemplate.bind(templateController)
    )

    /**
     * Get all templates for user (custom + system defaults)
     * @route GET /api/templates
     * @access Private
     */
    fastify.get(
      '/',
      {
        schema: {
          tags: ['Templates'],
          description: 'Get all templates (custom + system defaults)',
          response: standardResponses({
            type: 'object',
            properties: {
              templates: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
          }),
        },
      },
      templateController.getUserTemplates.bind(templateController)
    )

    /**
     * Get template quota
     * @route GET /api/templates/quota
     * @access Private
     */
    fastify.get(
      '/quota',
      {
        schema: {
          tags: ['Templates'],
          description: 'Get template usage quota for current plan',
          response: standardResponses({
            type: 'object',
            properties: {
              quota: {
                type: 'object',
                properties: {
                  used: { type: 'number' },
                  limit: {
                    oneOf: [{ type: 'number' }, { type: 'string', enum: ['unlimited'] }],
                  },
                  remaining: {
                    oneOf: [{ type: 'number' }, { type: 'string', enum: ['unlimited'] }],
                  },
                },
              },
            },
          }),
        },
      },
      templateController.getTemplateQuota.bind(templateController)
    )

    /**
     * Get a single template by ID
     * @route GET /api/templates/:id
     * @access Private
     */
    fastify.get(
      '/:id',
      {
        schema: {
          tags: ['Templates'],
          description: 'Get a single template by ID',
          params: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
          response: {
            ...standardResponses({ type: 'object', additionalProperties: true }),
            404: errorResponse,
          },
        },
      },
      templateController.getTemplateById.bind(templateController)
    )

    /**
     * Update a template
     * @route PATCH /api/templates/:id
     * @access Private
     * @rateLimit 60 requests/hour per user
     */
    fastify.patch(
      '/:id',
      {
        bodyLimit: 1024 * 10, // 10KB max for template data
        config:
          env.NODE_ENV !== 'test'
            ? {
                rateLimit: rateLimitPresets.noteUpdate,
              }
            : {},
        schema: {
          tags: ['Templates'],
          description: 'Update a custom template',
          params: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
          body: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                minLength: 1,
                maxLength: 100,
              },
              description: {
                type: 'string',
                maxLength: 500,
                nullable: true,
              },
              prompt: {
                type: 'string',
                minLength: 10,
                maxLength: 2000,
              },
              icon: {
                type: 'string',
                maxLength: 10,
                nullable: true,
              },
            },
          },
          response: {
            ...standardResponses({ type: 'object', additionalProperties: true }),
            403: errorResponse,
            404: errorResponse,
          },
        },
      },
      templateController.updateTemplate.bind(templateController)
    )

    /**
     * Delete a template
     * @route DELETE /api/templates/:id
     * @access Private
     * @rateLimit 60 requests/hour per user
     */
    fastify.delete(
      '/:id',
      {
        config:
          env.NODE_ENV !== 'test'
            ? {
                rateLimit: rateLimitPresets.noteDelete,
              }
            : {},
        schema: {
          tags: ['Templates'],
          description: 'Delete a custom template',
          params: {
            type: 'object',
            properties: {
              id: { type: 'string' },
            },
            required: ['id'],
          },
          response: {
            204: {
              type: 'null',
              description: 'Template deleted successfully',
            },
            403: errorResponse,
            404: errorResponse,
          },
        },
      },
      templateController.deleteTemplate.bind(templateController)
    )
  }
)
