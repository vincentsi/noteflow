import type { FastifyRequest, FastifyReply } from 'fastify'
import { noteService } from '@/services/note.service'
import {
  createNoteSchema,
  updateNoteSchema,
  getNotesSchema,
  searchNotesSchema,
  noteIdSchema,
} from '@/schemas/note.schema'
import { handleControllerError } from '@/utils/error-response'
import { requireAuth } from '@/utils/require-auth'
import {
  createAuthHandler,
  createAuthQueryHandler,
  createAuthParamBodyHandler,
  createAuthParamHandler,
} from '@/utils/controller-wrapper'

/**
 * Note controller
 * Handles note-related routes
 */
export class NoteController {
  /**
   * POST /api/notes
   * Create a new note
   */
  async createNote(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const body = createNoteSchema.parse(request.body)
      const note = await noteService.createNote(userId, body)

      return reply.status(201).send({
        success: true,
        data: note,
      })
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Plan limit reached': (err, reply) => {
          return reply.status(403).send({
            success: false,
            error: 'Plan limit reached',
            message:
              'You have reached your note limit for your current plan. Please upgrade to create more notes.',
          })
        },
      })
    }
  }

  /**
   * GET /api/notes
   * Get user notes with optional tag filtering
   */
  getUserNotes = createAuthQueryHandler(getNotesSchema, async (userId, query) => {
    const notes = await noteService.getUserNotes(userId, {
      tags: query.tags,
    })
    return { notes }
  })

  /**
   * PATCH /api/notes/:id
   * Update a note
   */
  updateNote = createAuthParamBodyHandler(
    noteIdSchema,
    updateNoteSchema,
    async (userId, params, body) => {
      const note = await noteService.updateNote(params.id, userId, body)
      return note
    },
    {
      'Note not found': (err, reply) =>
        reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Note not found',
        }),
      'Record to update not found': (err, reply) =>
        reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Note not found',
        }),
      P2025: (err, reply) =>
        reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Note not found',
        }),
    }
  )

  /**
   * DELETE /api/notes/:id
   * Delete a note
   */
  async deleteNote(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const params = noteIdSchema.parse(request.params)
      await noteService.deleteNote(params.id, userId)
      return reply.status(204).send()
    } catch (error) {
      return handleControllerError(error, request, reply, {
        'Not found': (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Note not found',
          }),
        'Record to delete does not exist': (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Note not found',
          }),
        P2025: (err, reply) =>
          reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Note not found',
          }),
      })
    }
  }

  /**
   * GET /api/notes/search
   * Search notes by title or content
   */
  searchNotes = createAuthQueryHandler(searchNotesSchema, async (userId, query) => {
    const notes = await noteService.searchNotes(userId, query.q)
    return { notes }
  })
}

export const noteController = new NoteController()
