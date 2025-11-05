import type { FastifyInstance } from 'fastify'
import { createProtectedRoutes } from '@/utils/protected-routes'
import { transcriptionController } from '@/controllers/transcription.controller'
import { env } from '@/config/env'
import {
  createResponses,
  standardResponses,
  errorResponse,
} from '@/schemas/common-responses.schema'

/**
 * Transcription routes
 * @param fastify - Fastify instance
 */
export const transcriptionRoutes = createProtectedRoutes(
  async (fastify: FastifyInstance): Promise<void> => {
    /**
     * Upload audio for transcription
     * @route POST /api/transcriptions
     * @access Private (STARTER and PRO only)
     * @rateLimit 10 requests/hour per user
     */
    fastify.post(
      '/',
      {
        // Allow large audio files (up to 25MB as per OpenAI Whisper limit)
        bodyLimit: 25 * 1024 * 1024,
        config:
          env.NODE_ENV !== 'test'
            ? {
                rateLimit: {
                  max: 10,
                  timeWindow: '1 hour',
                },
              }
            : {},
        schema: {
          tags: ['Transcriptions'],
          description: 'Upload audio file for transcription (STARTER and PRO plans only)',
          consumes: ['multipart/form-data'],
          response: {
            ...createResponses({
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                fileName: { type: 'string' },
                mimeType: { type: 'string' },
                fileSize: { type: 'number' },
                status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'] },
                createdAt: { type: 'string' },
                updatedAt: { type: 'string' },
              },
            }),
            400: errorResponse,
            403: errorResponse,
            413: errorResponse,
          },
        },
      },
      transcriptionController.createTranscription.bind(transcriptionController)
    )

    /**
     * Get all user transcriptions
     * @route GET /api/transcriptions
     * @access Private
     */
    fastify.get(
      '/',
      {
        schema: {
          tags: ['Transcriptions'],
          description: 'Get all user transcriptions',
          response: standardResponses({
            type: 'object',
            properties: {
              transcriptions: {
                type: 'array',
                items: {
                  type: 'object',
                  additionalProperties: true,
                },
              },
            },
          }),
        },
      },
      transcriptionController.getUserTranscriptions.bind(transcriptionController)
    )

    /**
     * Get transcription usage
     * @route GET /api/transcriptions/usage
     * @access Private
     */
    fastify.get(
      '/usage',
      {
        schema: {
          tags: ['Transcriptions'],
          description: 'Get transcription usage for current month',
          response: standardResponses({
            type: 'object',
            properties: {
              count: { type: 'number' },
              limit: { type: 'number' },
              remaining: { type: 'number' },
            },
          }),
        },
      },
      transcriptionController.getUsage.bind(transcriptionController)
    )

    /**
     * Get a single transcription
     * @route GET /api/transcriptions/:id
     * @access Private
     */
    fastify.get(
      '/:id',
      {
        schema: {
          tags: ['Transcriptions'],
          description: 'Get a transcription by ID',
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
      transcriptionController.getTranscription.bind(transcriptionController)
    )

    /**
     * Delete a transcription
     * @route DELETE /api/transcriptions/:id
     * @access Private
     */
    fastify.delete(
      '/:id',
      {
        schema: {
          tags: ['Transcriptions'],
          description: 'Delete a transcription',
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
              description: 'Transcription deleted successfully',
            },
            404: errorResponse,
          },
        },
      },
      transcriptionController.deleteTranscription.bind(transcriptionController)
    )
  }
)
