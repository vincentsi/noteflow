import type { FastifyInstance } from 'fastify'
import { createProtectedRoutes } from '@/utils/protected-routes'
import { noteController } from '@/controllers/note.controller'
import { env } from '@/config/env'
import {
  createResponses,
  standardResponses,
  errorResponse,
} from '@/schemas/common-responses.schema'
import { rateLimitPresets } from '@/utils/rate-limit-configs'

/**
 * Note routes
 * @param fastify - Fastify instance
 */
export const noteRoutes = createProtectedRoutes(async (fastify: FastifyInstance): Promise<void> => {
  /**
   * Create a note
   * @route POST /api/notes
   * @access Private
   * @rateLimit 60 requests/hour per user (prevents abuse)
   */
  fastify.post(
    '/',
    {
      // SECURITY: Limit body size to 100KB for markdown notes
      bodyLimit: 1024 * 100, // 100KB
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: rateLimitPresets.noteCreate,
            }
          : {},
      schema: {
        tags: ['Notes'],
        description: 'Create a new note',
        body: {
          type: 'object',
          properties: {
            title: { type: 'string', minLength: 1, maxLength: 200 },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' }, default: [] },
          },
          required: ['title', 'content'],
        },
        response: {
          ...createResponses({ type: 'object', additionalProperties: true }),
          403: errorResponse,
        },
      },
    },
    noteController.createNote.bind(noteController)
  )

  /**
   * Create a note from a summary
   * @route POST /api/notes/from-summary
   * @access Private
   * @rateLimit 30 requests/hour per user
   */
  fastify.post(
    '/from-summary',
    {
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: {
                max: env.NODE_ENV === 'production' ? 30 : 100,
                timeWindow: '1 hour',
                keyGenerator: request => {
                  const userId = request.user?.userId || 'anonymous'
                  return `note:from-summary:${userId}`
                },
              },
            }
          : {},
      schema: {
        tags: ['Notes'],
        description: 'Create a note from an existing summary',
        body: {
          type: 'object',
          properties: {
            summaryId: { type: 'string' },
          },
          required: ['summaryId'],
        },
        response: {
          ...createResponses({ type: 'object', additionalProperties: true }),
          403: errorResponse,
          404: errorResponse,
        },
      },
    },
    noteController.createNoteFromSummary.bind(noteController)
  )

  /**
   * Get user notes
   * @route GET /api/notes
   * @access Private
   */
  fastify.get(
    '/',
    {
      schema: {
        tags: ['Notes'],
        description: 'Get user notes with optional filtering and sorting',
        querystring: {
          type: 'object',
          properties: {
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags to filter by',
            },
            sortBy: {
              type: 'string',
              enum: ['updatedAt', 'createdAt', 'title'],
              description: 'Field to sort by',
            },
            sortOrder: {
              type: 'string',
              enum: ['asc', 'desc'],
              description: 'Sort order',
            },
          },
        },
        response: standardResponses({
          type: 'object',
          properties: {
            notes: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        }),
      },
    },
    noteController.getUserNotes.bind(noteController)
  )

  /**
   * Search notes
   * @route GET /api/notes/search
   * @access Private
   */
  fastify.get(
    '/search',
    {
      schema: {
        tags: ['Notes'],
        description: 'Search notes by title or content',
        querystring: {
          type: 'object',
          properties: {
            q: { type: 'string', minLength: 1 },
          },
          required: ['q'],
        },
        response: standardResponses({
          type: 'object',
          properties: {
            notes: {
              type: 'array',
              items: { type: 'object', additionalProperties: true },
            },
          },
        }),
      },
    },
    noteController.searchNotes.bind(noteController)
  )

  /**
   * Update a note
   * @route PATCH /api/notes/:id
   * @access Private
   * @rateLimit 60 requests/hour per user (prevents abuse)
   */
  fastify.patch(
    '/:id',
    {
      // SECURITY: Limit body size to 100KB for markdown notes
      bodyLimit: 1024 * 100, // 100KB
      config:
        env.NODE_ENV !== 'test'
          ? {
              rateLimit: rateLimitPresets.noteUpdate,
            }
          : {},
      schema: {
        tags: ['Notes'],
        description: 'Update a note',
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
            title: { type: 'string', minLength: 1, maxLength: 200 },
            content: { type: 'string' },
            tags: { type: 'array', items: { type: 'string' } },
          },
        },
        response: {
          ...standardResponses({ type: 'object', additionalProperties: true }),
          404: errorResponse,
        },
      },
    },
    noteController.updateNote.bind(noteController)
  )

  /**
   * Toggle pinned status
   * @route PATCH /api/notes/:id/pin
   * @access Private
   */
  fastify.patch(
    '/:id/pin',
    {
      schema: {
        tags: ['Notes'],
        description: 'Toggle pinned status of a note',
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
    noteController.togglePinned.bind(noteController)
  )

  /**
   * Delete a note
   * @route DELETE /api/notes/:id
   * @access Private
   * @rateLimit 60 requests/hour per user (prevents abuse)
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
        tags: ['Notes'],
        description: 'Delete a note',
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
            description: 'Note deleted successfully',
          },
          404: errorResponse,
        },
      },
    },
    noteController.deleteNote.bind(noteController)
  )
})
