import type { FastifyRequest, FastifyReply } from 'fastify'
import { SummaryService } from '@/services/summary.service'
import {
  createSummarySchema,
  type CreateSummaryDTO,
} from '@/schemas/summary.schema'
import { handleControllerError } from '@/utils/error-response'
import { prisma } from '@/config/prisma'
import { getSummaryQueue } from '@/queues/summary.queue'

const summaryService = new SummaryService()

/**
 * Summary controller
 * Handles summary-related routes
 */
export class SummaryController {
  /**
   * POST /api/summaries
   * Create a new summary generation job
   */
  async createSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate request body
      const body = createSummarySchema.parse(request.body)

      // Get user language if not provided
      let language = body.language
      if (!language) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { language: true },
        })
        language = (user?.language as 'fr' | 'en') || 'fr'
      }

      // Create summary job
      const result = await summaryService.createSummary(
        userId,
        body.text,
        body.style,
        language
      )

      return reply.status(202).send({
        success: true,
        data: {
          jobId: result.jobId,
          message: 'Summary generation job created',
        },
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Summary limit reached': (err, reply) => {
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
   * GET /api/summaries/:jobId/status
   * Get summary job status
   */
  async getSummaryStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const { jobId } = request.params as { jobId: string }

      // First check if job exists in queue
      const queue = getSummaryQueue()
      if (queue) {
        const job = await queue.getJob(jobId)
        if (job) {
          const state = await job.getState()
          return reply.status(200).send({
            success: true,
            data: {
              status: state,
              jobId: job.id,
            },
          })
        }
      }

      // If job not in queue, check if summary was completed and stored in DB
      // JobId convention: "completed-{summaryId}" for completed summaries
      const summaryId = jobId.startsWith('completed-')
        ? jobId.replace('completed-', '')
        : null

      if (summaryId) {
        const summary = await prisma.summary.findFirst({
          where: {
            id: summaryId,
            userId,
          },
        })

        if (summary) {
          return reply.status(200).send({
            success: true,
            data: {
              status: 'completed',
              summary: {
                id: summary.id,
                title: summary.title,
                originalText: summary.originalText,
                summaryText: summary.summaryText,
                style: summary.style,
                source: summary.source,
                language: summary.language,
                createdAt: summary.createdAt,
              },
            },
          })
        }
      }

      // Job not found in queue or database
      return reply.status(404).send({
        success: false,
        error: 'Job not found',
        message: 'Summary job not found',
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/summaries
   * Get user summaries with pagination
   */
  async getUserSummaries(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Parse query parameters
      const query = request.query as {
        page?: string
        limit?: string
      }
      const page = query.page ? parseInt(query.page, 10) : 1
      const limit = query.limit ? parseInt(query.limit, 10) : 20

      // Get summaries
      const result = await summaryService.getUserSummaries(userId, page, limit)

      return reply.status(200).send({
        success: true,
        data: result,
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }
}

export const summaryController = new SummaryController()
