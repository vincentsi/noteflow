import type { FastifyRequest, FastifyReply } from 'fastify'
import { SummaryService } from '@/services/summary.service'
import { AIService } from '@/services/ai.service'
import { CacheService } from '@/services/cache.service'
import { createSummarySchema, type SummaryStyle } from '@/schemas/summary.schema'
import { handleControllerError } from '@/utils/error-response'
import { prisma } from '@/config/prisma'
import { getSummaryQueue } from '@/queues/summary.queue'

const summaryService = new SummaryService()
const aiService = new AIService()

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
        // Handle multipart file upload
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

        // Extract text from PDF
        const buffer = await data.toBuffer()
        text = await aiService.extractTextFromPDF(buffer)

        if (!text || text.trim().length < 10) {
          return reply.status(400).send({
            success: false,
            error: 'Bad Request',
            message: 'Could not extract text from PDF or text is too short',
          })
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

      // First check if job exists in queue
      const queue = getSummaryQueue()
      if (queue) {
        const job = await queue.getJob(jobId)
        if (job) {
          const state = await job.getState()

          // If job is completed, fetch the summary from the database
          if (state === 'completed') {
            // Get the return value (summaryId)
            const returnValue = await job.returnvalue
            const summaryId = returnValue?.summaryId

            if (summaryId) {
              // Try cache first
              const cacheKey = `summary:${summaryId}`
              const cached = await CacheService.get(cacheKey)

              if (cached) {
                return reply.status(200).send({
                  success: true,
                  data: {
                    status: 'completed',
                    jobId: job.id as string,
                    summary: cached,
                  },
                })
              }

              // Cache miss - query database
              const summary = await prisma.summary.findFirst({
                where: {
                  id: summaryId,
                  userId,
                },
              })

              if (summary) {
                const summaryData = {
                  id: summary.id,
                  title: summary.title,
                  originalText: summary.originalText,
                  summaryText: summary.summaryText,
                  style: summary.style,
                  source: summary.source,
                  language: summary.language,
                  createdAt: summary.createdAt,
                }

                // Cache for 60 seconds
                await CacheService.set(cacheKey, summaryData, 60)

                return reply.status(200).send({
                  success: true,
                  data: {
                    status: 'completed',
                    jobId: job.id as string,
                    summary: summaryData,
                  },
                })
              }
            }

            // Fallback: if no summaryId, fetch the most recent summary for this user
            const latestSummary = await prisma.summary.findFirst({
              where: { userId },
              orderBy: { createdAt: 'desc' },
            })

            if (latestSummary) {
              const summaryData = {
                id: latestSummary.id,
                title: latestSummary.title,
                originalText: latestSummary.originalText,
                summaryText: latestSummary.summaryText,
                style: latestSummary.style,
                source: latestSummary.source,
                language: latestSummary.language,
                createdAt: latestSummary.createdAt,
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

      // If job not in queue, check if summary was completed and stored in DB
      // JobId convention: "completed-{summaryId}" for completed summaries
      const summaryId = jobId.startsWith('completed-')
        ? jobId.replace('completed-', '')
        : null

      if (summaryId) {
        // Try cache first
        const cacheKey = `summary:${summaryId}`
        const cached = await CacheService.get(cacheKey)

        if (cached) {
          return reply.status(200).send({
            success: true,
            data: {
              status: 'completed',
              summary: cached,
            },
          })
        }

        // Cache miss - query database
        const summary = await prisma.summary.findFirst({
          where: {
            id: summaryId,
            userId,
          },
        })

        if (summary) {
          const summaryData = {
            id: summary.id,
            title: summary.title,
            originalText: summary.originalText,
            summaryText: summary.summaryText,
            style: summary.style,
            source: summary.source,
            language: summary.language,
            createdAt: summary.createdAt,
          }

          // Cache for 60 seconds
          await CacheService.set(cacheKey, summaryData, 60)

          return reply.status(200).send({
            success: true,
            data: {
              status: 'completed',
              summary: summaryData,
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
        originalText: summary.originalText,
        summaryText: summary.summaryText,
        style: summary.style,
        source: summary.source,
        language: summary.language,
        createdAt: summary.createdAt,
      }

      // Cache for 60 seconds
      await CacheService.set(cacheKey, summaryData, 60)

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
