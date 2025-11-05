import type { FastifyRequest, FastifyReply } from 'fastify'
import { noteService } from '@/services/note.service'
import {
  createNoteSchema,
  updateNoteSchema,
  getNotesSchema,
  searchNotesSchema,
  noteIdSchema,
  createNoteFromSummarySchema,
} from '@/schemas/note.schema'
import { handleControllerError } from '@/utils/error-response'
import { requireAuth } from '@/utils/require-auth'
import {
  createAuthQueryHandler,
  createAuthParamBodyHandler,
  createAuthParamHandler,
} from '@/utils/controller-wrapper'
import { prisma } from '@/config/prisma'

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
   * Get user notes with optional tag filtering and sorting
   */
  getUserNotes = createAuthQueryHandler(getNotesSchema, async (userId, query) => {
    const notes = await noteService.getUserNotes(userId, {
      tags: query.tags,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
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
   * PATCH /api/notes/:id/pin
   * Toggle pinned status of a note
   */
  togglePinned = createAuthParamHandler(async (userId, params) => {
    const { id } = noteIdSchema.parse(params)
    const note = await noteService.togglePinned(id, userId)
    return note
  })

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

  /**
   * POST /api/notes/from-summary
   * Create a note from a summary
   */
  async createNoteFromSummary(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = requireAuth(request)
      const { summaryId } = createNoteFromSummarySchema.parse(request.body)

      // Fetch the summary and verify ownership
      const summary = await prisma.summary.findFirst({
        where: {
          id: summaryId,
          userId,
        },
      })

      if (!summary) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Summary not found',
        })
      }

      // Create note from summary
      const note = await noteService.createNote(userId, {
        title: summary.title || `Summary - ${new Date(summary.createdAt).toLocaleDateString()}`,
        content: summary.summaryText,
        tags: ['summary', summary.style.toLowerCase()],
      })

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
        'Summary not found': (err, reply) => {
          return reply.status(404).send({
            success: false,
            error: 'Not Found',
            message: 'Summary not found',
          })
        },
      })
    }
  }
}

export const noteController = new NoteController()
