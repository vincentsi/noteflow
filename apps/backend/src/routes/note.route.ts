import type { FastifyInstance } from 'fastify'
import { createProtectedRoutes } from '@/utils/protected-routes'
import { noteController } from '@/controllers/note.controller'

/**
 * Note routes
 * @param fastify - Fastify instance
 */
export const noteRoutes = createProtectedRoutes(async (fastify: FastifyInstance): Promise<void> => {
  /**
   * Create a note
   * @route POST /api/notes
   * @access Private
   */
  fastify.post(
    '/',
    {
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
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
          403: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    noteController.createNote.bind(noteController)
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
        description: 'Get user notes with optional tag filtering',
        querystring: {
          type: 'object',
          properties: {
            tags: {
              type: 'string',
              description: 'Comma-separated list of tags to filter by',
            },
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
                  notes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                },
              },
            },
          },
        },
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
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  notes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      additionalProperties: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    noteController.searchNotes.bind(noteController)
  )

  /**
   * Update a note
   * @route PATCH /api/notes/:id
   * @access Private
   */
  fastify.patch(
    '/:id',
    {
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
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                additionalProperties: true,
              },
            },
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    noteController.updateNote.bind(noteController)
  )

  /**
   * Delete a note
   * @route DELETE /api/notes/:id
   * @access Private
   */
  fastify.delete(
    '/:id',
    {
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
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    noteController.deleteNote.bind(noteController)
  )
})
