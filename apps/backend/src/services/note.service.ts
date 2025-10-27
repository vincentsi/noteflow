import { prisma } from '@/config/prisma'
import { PlanLimiter } from '@/utils/plan-limiter'

export interface CreateNoteData {
  title: string
  content: string
  tags: string[]
}

export interface UpdateNoteData {
  title?: string
  content?: string
  tags?: string[]
}

export interface GetNotesFilters {
  tags?: string[]
}

export class NoteService {
  /**
   * Create a new note for user
   * Checks plan limits before creating
   */
  async createNote(userId: string, data: CreateNoteData) {
    // Check plan limits using centralized utility
    await PlanLimiter.checkLimit(userId, 'note')

    // Create the note
    const note = await prisma.note.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        tags: data.tags,
      },
    })

    // Invalidate cache
    await PlanLimiter.invalidateCache(userId, 'note')

    return note
  }

  /**
   * Get all notes for a user
   * Optional filtering by tags
   */
  async getUserNotes(userId: string, filters?: GetNotesFilters) {
    const where: { userId: string; tags?: { hasSome: string[] } } = {
      userId,
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags }
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    return notes
  }

  /**
   * Update a note
   * Only the note owner can update it
   */
  async updateNote(noteId: string, userId: string, data: UpdateNoteData) {
    // Check if note exists and belongs to user
    const existingNote = await prisma.note.findFirst({
      where: {
        id: noteId,
        userId,
      },
    })

    if (!existingNote) {
      throw new Error('Note not found')
    }

    const note = await prisma.note.update({
      where: {
        id: noteId,
      },
      data,
    })

    return note
  }

  /**
   * Delete a note
   * Only the note owner can delete it
   */
  async deleteNote(noteId: string, userId: string) {
    await prisma.note.delete({
      where: {
        id: noteId,
        userId, // Ensures only owner can delete
      },
    })
  }

  /**
   * Search notes by title or content
   */
  async searchNotes(userId: string, query: string) {
    const notes = await prisma.note.findMany({
      where: {
        userId,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
    })

    return notes
  }
}

// Export singleton instance
export const noteService = new NoteService()
