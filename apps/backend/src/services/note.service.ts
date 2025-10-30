import { prisma } from '@/config/prisma'
import { PlanLimiter } from '@/utils/plan-limiter'
import { buildTagsFilter, buildSoftDeleteFilter } from '@/utils/query-builders'
import { BaseCrudService } from './base-crud.service'
import { Prisma, type Note } from '@prisma/client'

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

export class NoteService extends BaseCrudService<Note> {
  protected modelName = 'Note'
  protected prismaModel = prisma.note
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
    // Build WHERE clause (only active notes - soft delete)
    const where: Prisma.NoteWhereInput = {
      userId,
      ...buildSoftDeleteFilter(),
    }

    const tagsFilter = buildTagsFilter(filters?.tags)
    if (tagsFilter) {
      where.tags = tagsFilter.tags
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
    // Use base class method for ownership verification
    await this.findByIdWithOwnership(noteId, userId)

    const note = await prisma.note.update({
      where: { id: noteId },
      data,
    })

    return note
  }

  /**
   * Delete a note (soft delete)
   * Only the note owner can delete it
   * Note: Uses soft delete to allow recovery
   */
  async deleteNote(noteId: string, userId: string) {
    // Use base class method for soft delete with ownership verification
    await this.softDelete(noteId, userId)
  }

  /**
   * Search notes by title or content
   */
  async searchNotes(userId: string, query: string) {
    // Build WHERE clause (only active notes)
    const where: Prisma.NoteWhereInput = {
      userId,
      ...buildSoftDeleteFilter(),
      OR: [
        { title: { contains: query, mode: 'insensitive' } },
        { content: { contains: query, mode: 'insensitive' } },
      ],
    }

    const notes = await prisma.note.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    })

    return notes
  }
}

// Export singleton instance
export const noteService = new NoteService()
