import { prisma } from '@/config/prisma'
import { PlanType } from '@prisma/client'
import { NOTE_LIMITS } from '@/constants/plan-limits'

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
    // Get user's plan type
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true },
    })

    if (!user) {
      throw new Error('User not found')
    }

    // Check plan limits (PRO = unlimited)
    if (user.planType !== PlanType.PRO) {
      const limit = NOTE_LIMITS[user.planType]

      const currentCount = await prisma.note.count({
        where: { userId },
      })

      if (currentCount >= limit) {
        throw new Error('Plan limit reached')
      }
    }

    // Create the note
    const note = await prisma.note.create({
      data: {
        userId,
        title: data.title,
        content: data.content,
        tags: data.tags,
      },
    })

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
    const note = await prisma.note.update({
      where: {
        id: noteId,
        userId, // Ensures only owner can update
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
