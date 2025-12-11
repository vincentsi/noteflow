import type { FastifyRequest, FastifyReply } from 'fastify'
import { templateService } from '@/services/template.service'
import {
  createTemplateSchema,
  updateTemplateSchema,
  deleteTemplateSchema,
  getTemplateSchema,
} from '@/schemas/template.schema'
import { handleControllerError } from '@/utils/error-response'
import { requireAuth } from '@/utils/require-auth'

/**
 * Template controller
 * Handles custom summary template routes
 */
export class TemplateController {
  /**
   * POST /api/templates
   * Create a new custom template
   */
  async createTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const { body } = createTemplateSchema.parse({ body: request.body })
      const template = await templateService.createTemplate(userId, body)

      return reply.status(201).send({
        success: true,
        data: template,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Custom templates are not available': (err, reply) => {
          return reply.status(403).send({
            success: false,
            error: 'Plan limit reached',
            message: err.message,
          })
        },
        'Template limit reached': (err, reply) => {
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
   * GET /api/templates
   * Get all templates for user (custom + system defaults)
   */
  async getUserTemplates(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const templates = await templateService.getUserTemplates(userId)

      return reply.status(200).send({
        success: true,
        data: { templates },
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/templates/:id
   * Get a single template by ID
   */
  async getTemplateById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const { params } = getTemplateSchema.parse({ params: request.params })
      const template = await templateService.getTemplateById(params.id, userId)

      return reply.status(200).send({
        success: true,
        data: template,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Template not found': (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Template not found',
          }),
      })
    }
  }

  /**
   * PATCH /api/templates/:id
   * Update a template
   */
  async updateTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const validated = updateTemplateSchema.parse({
        params: request.params,
        body: request.body,
      })
      const template = await templateService.updateTemplate(
        validated.params.id,
        userId,
        validated.body
      )

      return reply.status(200).send({
        success: true,
        data: template,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Template not found': (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Template not found or you do not have permission to update it',
          }),
        'Cannot update system default templates': (err, reply) =>
          reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Cannot update system default templates',
          }),
      })
    }
  }

  /**
   * DELETE /api/templates/:id
   * Delete a template
   */
  async deleteTemplate(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const { params } = deleteTemplateSchema.parse({ params: request.params })
      await templateService.deleteTemplate(params.id, userId)
      return reply.status(204).send()
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Template not found': (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Template not found or you do not have permission to delete it',
          }),
        'Cannot delete system default templates': (err, reply) =>
          reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message: 'Cannot delete system default templates',
          }),
      })
    }
  }

  /**
   * GET /api/templates/quota
   * Get template quota for user
   */
  async getTemplateQuota(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const quota = await templateService.getTemplateQuota(userId)

      return reply.status(200).send({
        success: true,
        data: { quota },
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }
}

export const templateController = new TemplateController()
