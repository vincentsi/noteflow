import type { FastifyRequest, FastifyReply } from 'fastify'
import { transcriptionService } from '@/services/transcription.service'
import { transcriptionIdSchema, validateAudioFile } from '@/schemas/transcription.schema'
import { handleControllerError } from '@/utils/error-response'
import { requireAuth } from '@/utils/require-auth'

/**
 * Transcription controller
 * Handles audio transcription routes
 */
export class TranscriptionController {
  /**
   * POST /api/transcriptions
   * Upload audio file for transcription
   */
  async createTranscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)

      // Get uploaded file from multipart form
      const data = await request.file()

      if (!data) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'No audio file provided',
        })
      }

      // Validate file
      const validation = validateAudioFile({
        mimetype: data.mimetype,
        size: data.file.bytesRead || 0,
        filename: data.filename,
      })

      if (!validation.valid) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: validation.error,
        })
      }

      // Read file buffer
      const buffer = await data.toBuffer()

      // Create transcription
      const transcription = await transcriptionService.createTranscription(userId, {
        buffer,
        fileName: data.filename,
        mimeType: data.mimetype,
      })

      // Process transcription asynchronously
      // In production, this should be handled by a queue (BullMQ)
      transcriptionService
        .processTranscription(transcription.id, buffer)
        .catch(err => console.error('Transcription processing error:', err))

      return reply.status(201).send({
        success: true,
        data: transcription,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Transcription feature is only available for STARTER and PRO plans': (err, reply) => {
          return reply.status(403).send({
            success: false,
            error: 'Forbidden',
            message:
              'Transcription feature is only available for STARTER and PRO plans. Please upgrade your plan.',
          })
        },
        'Transcription limit reached': (err, reply) => {
          return reply.status(403).send({
            success: false,
            error: 'Limit Reached',
            message: err.message,
          })
        },
        'File too large': (err, reply) => {
          return reply.status(413).send({
            success: false,
            error: 'Payload Too Large',
            message: err.message,
          })
        },
      })
    }
  }

  /**
   * GET /api/transcriptions
   * Get all user transcriptions
   */
  async getUserTranscriptions(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const transcriptions = await transcriptionService.getUserTranscriptions(userId)
      return reply.status(200).send({
        success: true,
        data: { transcriptions },
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/transcriptions/usage
   * Get transcription usage for current month
   */
  async getUsage(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const usage = await transcriptionService.getMonthlyUsage(userId)
      return reply.status(200).send({
        success: true,
        data: usage,
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/transcriptions/:id
   * Get a single transcription
   */
  async getTranscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const { id } = transcriptionIdSchema.parse(request.params)
      const transcription = await transcriptionService.getTranscription(id, userId)
      return reply.status(200).send({
        success: true,
        data: transcription,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Transcription not found': (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Transcription not found',
          }),
      })
    }
  }

  /**
   * DELETE /api/transcriptions/:id
   * Delete a transcription
   */
  async deleteTranscription(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const params = transcriptionIdSchema.parse(request.params)
      await transcriptionService.deleteTranscription(params.id, userId)
      return reply.status(204).send()
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Transcription not found': (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Transcription not found',
          }),
      })
    }
  }
}

export const transcriptionController = new TranscriptionController()
