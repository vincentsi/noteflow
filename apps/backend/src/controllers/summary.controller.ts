import type { FastifyRequest, FastifyReply } from 'fastify'
import type { Summary } from '@prisma/client'
import { summaryService } from '@/services/summary.service'
import { aiService } from '@/services/ai.service'
import { CacheService } from '@/services/cache.service'
import {
  createSummarySchema,
  getSummariesSchema,
  type SummaryStyle,
} from '@/schemas/summary.schema'
import { handleControllerError } from '@/utils/error-response'
import { prisma } from '@/config/prisma'
import { getSummaryQueue } from '@/queues/summary.queue'
import { logger } from '@/utils/logger'
import { CACHE_TTL } from '@/constants/performance'
import {
  streamFileToDisk,
  cleanupTempFile,
  getFileSizeLimitForPlan,
} from '@/utils/streaming-upload'
import { PlanType } from '@prisma/client'

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

      // Check if request is multipart (file upload)
      const contentType = request.headers['content-type']
      const isMultipart = contentType?.includes('multipart/form-data')

      let text: string
      let style: SummaryStyle
      let language: 'fr' | 'en' | undefined

      if (isMultipart) {
        // Handle multipart file upload with streaming
        const data = await request.file()

        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'Bad Request',
            message: 'No file provided',
          })
        }

        // Get form fields
        const fields = data.fields as Record<string, { value: string }>
        style = (fields.style?.value || 'SHORT') as SummaryStyle
        language = fields.language?.value as 'fr' | 'en' | undefined

        // Get user's plan to determine file size limit
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { planType: true },
        })
        const planType = (user?.planType || PlanType.FREE) as PlanType
        const maxFileSize = getFileSizeLimitForPlan(planType)

        let tempFilePath: string | null = null

        try {
          // Stream file to disk instead of loading to memory
          tempFilePath = await streamFileToDisk(data, maxFileSize)

          // Extract text from PDF file
          text = await aiService.extractTextFromPDFFile(tempFilePath)

          if (!text || text.trim().length < 10) {
            return reply.status(400).send({
              success: false,
              error: 'Bad Request',
              message: 'Could not extract text from PDF or text is too short',
            })
          }
        } catch (error) {
          if (error instanceof Error && error.message.includes('exceeds limit')) {
            return reply.status(413).send({
              success: false,
              error: 'Payload Too Large',
              message: error.message,
            })
          }
          throw error
        } finally {
          // Always cleanup temp file
          if (tempFilePath) {
            await cleanupTempFile(tempFilePath)
          }
        }
      } else {
        // Handle JSON request
        const body = createSummarySchema.parse(request.body)
        text = body.text
        style = body.style
        language = body.language
      }

      // Get user language if not provided
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
        text,
        style,
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

      // Check if job exists in queue
      const queue = getSummaryQueue()
      if (queue) {
        const job = await queue.getJob(jobId)
        if (job) {
          // Validate job ownership
          const ownershipError = this.checkJobOwnership(job, userId)
          if (ownershipError) {
            return reply.status(403).send(ownershipError)
          }

          // Handle job based on state
          const state = await job.getState()
          if (state === 'completed') {
            return this.handleCompletedJob(job, userId, reply)
          }

          return reply.status(200).send({
            success: true,
            data: {
              status: state,
              jobId: job.id as string,
            },
          })
        }
      }

      // Check if summary was completed and stored in DB (jobId: "completed-{summaryId}")
      const summaryId = this.extractSummaryIdFromJobId(jobId)
      if (summaryId) {
        return this.handleCompletedSummaryId(summaryId, userId, reply)
      }

      // Job not found
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
   * Validates that the job belongs to the requesting user
   */
  private checkJobOwnership(job: { data: { userId: string } }, userId: string) {
    if (job.data.userId !== userId) {
      return {
        success: false,
        error: 'Forbidden',
        message: 'You do not have access to this job',
      }
    }
    return null
  }

  /**
   * Extracts summaryId from completed job ID format: "completed-{summaryId}"
   */
  private extractSummaryIdFromJobId(jobId: string): string | null {
    return jobId.startsWith('completed-')
      ? jobId.replace('completed-', '')
      : null
  }

  /**
   * Formats summary data for API response
   */
  private formatSummaryData(summary: Summary) {
    return {
      id: summary.id,
      title: summary.title,
      coverImage: summary.coverImage,
      originalText: summary.originalText,
      summaryText: summary.summaryText,
      style: summary.style,
      source: summary.source,
      language: summary.language,
      createdAt: summary.createdAt,
    }
  }

  /**
   * Fetches summary from cache or database and caches it
   */
  private async fetchAndCacheSummary(summaryId: string, userId: string) {
    const cacheKey = `summary:${summaryId}`

    // Try cache first
    const cached = await CacheService.get(cacheKey)
    if (cached) {
      return cached
    }

    // Cache miss - query database
    const summary = await prisma.summary.findFirst({
      where: {
        id: summaryId,
        userId,
      },
    })

    if (!summary) {
      return null
    }

    const summaryData = this.formatSummaryData(summary)

    // Cache for 1 hour (summaries are immutable)
    await CacheService.set(cacheKey, summaryData, CACHE_TTL.SUMMARY)

    return summaryData
  }

  /**
   * Handles completed job by fetching and returning the summary
   */
  private async handleCompletedJob(
    job: { id?: string; returnvalue?: { summaryId?: string } },
    userId: string,
    reply: FastifyReply
  ) {
    const returnValue = job.returnvalue
    const summaryId = returnValue?.summaryId

    if (!summaryId) {
      logger.error(
        `Job ${job.id as string} completed but no summaryId in returnValue. UserId: ${userId}`
      )
      return reply.status(500).send({
        success: false,
        error: 'Summary generation completed but result not found. Please try creating a new summary.',
      })
    }

    const summaryData = await this.fetchAndCacheSummary(summaryId, userId)

    if (!summaryData) {
      logger.error(
        `Job ${job.id as string} completed but summary not found in DB. SummaryId: ${summaryId}, UserId: ${userId}`
      )
      return reply.status(500).send({
        success: false,
        error: 'Summary generation completed but result not found. Please try creating a new summary.',
      })
    }

    return reply.status(200).send({
      success: true,
      data: {
        status: 'completed',
        jobId: job.id as string,
        summary: summaryData,
      },
    })
  }

  /**
   * Handles completed summary ID by fetching and returning the summary
   */
  private async handleCompletedSummaryId(summaryId: string, userId: string, reply: FastifyReply) {
    const summaryData = await this.fetchAndCacheSummary(summaryId, userId)

    if (!summaryData) {
      return reply.status(404).send({
        success: false,
        error: 'Summary not found',
        message: 'Summary not found',
      })
    }

    return reply.status(200).send({
      success: true,
      data: {
        status: 'completed',
        summary: summaryData,
      },
    })
  }

  /**
   * GET /api/summaries/:id
   * Get a single summary by ID
   */
  async getSummaryById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const { id } = request.params as { id: string }

      // Try cache first
      const cacheKey = `summary:${id}`
      const cached = await CacheService.get(cacheKey)

      if (cached) {
        return reply.status(200).send({
          success: true,
          data: { summary: cached },
        })
      }

      // Cache miss - query database
      const summary = await prisma.summary.findFirst({
        where: {
          id,
          userId,
        },
      })

      if (!summary) {
        return reply.status(404).send({
          success: false,
          error: 'Not found',
          message: 'Summary not found',
        })
      }

      const summaryData = {
        id: summary.id,
        title: summary.title,
        coverImage: summary.coverImage,
        originalText: summary.originalText,
        summaryText: summary.summaryText,
        style: summary.style,
        source: summary.source,
        language: summary.language,
        createdAt: summary.createdAt,
      }

      // Cache for 1 hour (summaries are immutable)
      await CacheService.set(cacheKey, summaryData, CACHE_TTL.SUMMARY)

      return reply.status(200).send({
        success: true,
        data: { summary: summaryData },
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

      // Validate and parse query parameters
      const { page, limit } = getSummariesSchema.parse(request.query)

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

  /**
   * DELETE /api/summaries/:id
   * Delete a summary
   */
  async deleteSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      const { id } = request.params as { id: string }

      await summaryService.deleteSummary(id, userId)

      return reply.status(200).send({
        success: true,
        message: 'Summary deleted successfully',
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }
}

export const summaryController = new SummaryController()
