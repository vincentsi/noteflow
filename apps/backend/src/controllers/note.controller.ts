import type { FastifyRequest, FastifyReply } from 'fastify'
import { NoteService } from '@/services/note.service'
import {
  createNoteSchema,
  updateNoteSchema,
  getNotesSchema,
  searchNotesSchema,
  noteIdSchema,
} from '@/schemas/note.schema'
import { handleControllerError } from '@/utils/error-response'

const noteService = new NoteService()

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
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate request body
      const body = createNoteSchema.parse(request.body)

      // Create note
      const note = await noteService.createNote(userId, body)

      return reply.status(201).send({
        success: true,
        data: note,
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'Plan limit reached') {
        return reply.status(403).send({
          success: false,
          error: 'Plan limit reached',
          message:
            'You have reached your note limit for your current plan. Please upgrade to create more notes.',
        })
      }
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/notes
   * Get user notes with optional tag filtering
   */
  async getUserNotes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate query params
      const query = getNotesSchema.parse(request.query)

      // Get notes
      const notes = await noteService.getUserNotes(userId, {
        tags: query.tags,
      })

      return reply.status(200).send({
        success: true,
        data: { notes },
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * PATCH /api/notes/:id
   * Update a note
   */
  async updateNote(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate params
      const params = noteIdSchema.parse(request.params)

      // Validate body
      const body = updateNoteSchema.parse(request.body)

      // Update note
      const note = await noteService.updateNote(params.id, userId, body)

      return reply.status(200).send({
        success: true,
        data: note,
      })
    } catch (error) {
      // Prisma throws P2025 when record to update not found
      // Or our service throws "Note not found"
      if (
        error instanceof Error &&
        (error.message.includes('Record to update not found') ||
          error.message.includes('P2025') ||
          error.message === 'Note not found')
      ) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Note not found',
        })
      }
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * DELETE /api/notes/:id
   * Delete a note
   */
  async deleteNote(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate params
      const params = noteIdSchema.parse(request.params)

      // Delete note
      await noteService.deleteNote(params.id, userId)

      return reply.status(204).send()
    } catch (error) {
      // Prisma throws P2025 when record to delete not found
      if (
        error instanceof Error &&
        (error.message.includes('Record to delete does not exist') ||
          error.message.includes('P2025') ||
          error.message.includes('Not found'))
      ) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Note not found',
        })
      }
      return handleControllerError(error, request, reply)
    }
  }

  /**
   * GET /api/notes/search
   * Search notes by title or content
   */
  async searchNotes(request: FastifyRequest, reply: FastifyReply) {
    try {
      const userId = request.user?.userId

      if (!userId) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'User not authenticated',
        })
      }

      // Validate query params
      const query = searchNotesSchema.parse(request.query)

      // Search notes
      const notes = await noteService.searchNotes(userId, query.q)

      return reply.status(200).send({
        success: true,
        data: { notes },
      })
    } catch (error) {
      return handleControllerError(error, request, reply)
    }
  }
}

export const noteController = new NoteController()
