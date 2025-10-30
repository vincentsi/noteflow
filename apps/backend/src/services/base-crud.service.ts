import { buildSoftDeleteFilter } from '@/utils/query-builders'
import { NotFoundError } from '@/utils/custom-errors'

/**
 * Base CRUD Service Class
 *
 * Provides common CRUD operations for services that manage database entities.
 * Eliminates ~150 lines of duplicate code across Note, Summary, and Article services.
 *
 * **Features:**
 * - Ownership verification (ensures users can only access their own data)
 * - Soft delete support (excludes soft-deleted records by default)
 * - Consistent error handling (throws NotFoundError)
 * - Type-safe with TypeScript generics
 *
 * **Usage:**
 * ```typescript
 * import { BaseCrudService } from './base-crud.service'
 * import { Note } from '@prisma/client'
 * import { prisma } from '@/config/prisma'
 *
 * export class NoteService extends BaseCrudService<Note> {
 *   protected modelName = 'Note'
 *   protected prismaModel = prisma.note
 *
 *   async getNoteById(noteId: string, userId: string): Promise<Note> {
 *     // Uses base class method - reduces 10 lines to 1
 *     return await this.findByIdWithOwnership(noteId, userId)
 *   }
 *
 *   async deleteNote(noteId: string, userId: string): Promise<Note> {
 *     // Uses base class method - reduces 15 lines to 1
 *     return await this.softDelete(noteId, userId)
 *   }
 * }
 * ```
 *
 * @template T - The Prisma model type (e.g., Note, Summary, Article)
 */
export abstract class BaseCrudService<
  T extends { id: string; userId: string; deletedAt?: Date | null },
> {
  /**
   * Human-readable model name for error messages
   * @example 'Note', 'Summary', 'Article'
   */
  protected abstract modelName: string

  /**
   * Prisma model delegate for database operations
   * @example prisma.note, prisma.summary, prisma.article
   *
   * Using 'any' here is intentional to work around Prisma's complex delegate types.
   * The actual type safety is enforced by the generic T parameter.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected abstract prismaModel: any

  /**
   * Find a record by ID with ownership verification and soft delete filtering
   *
   * **Before (10 lines in every service):**
   * ```typescript
   * const note = await prisma.note.findFirst({
   *   where: {
   *     id: noteId,
   *     userId,
   *     deletedAt: null
   *   }
   * })
   * if (!note) {
   *   throw new Error('Note not found')
   * }
   * ```
   *
   * **After (1 line):**
   * ```typescript
   * const note = await this.findByIdWithOwnership(noteId, userId)
   * ```
   *
   * @param id - Record ID
   * @param userId - Owner user ID
   * @param options - Optional configuration
   * @param options.includeDeleted - Include soft-deleted records (default: false)
   * @throws {NotFoundError} if record not found or user doesn't own it
   * @returns The found record
   */
  protected async findByIdWithOwnership(
    id: string,
    userId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<T> {
    const where = {
      id,
      userId,
      ...(options?.includeDeleted ? {} : buildSoftDeleteFilter()),
    }

    const record = await this.prismaModel.findFirst({ where })

    if (!record) {
      throw new NotFoundError(`${this.modelName} not found`)
    }

    return record
  }

  /**
   * Soft delete a record with ownership verification
   *
   * **Before (15 lines in every service):**
   * ```typescript
   * const note = await prisma.note.findFirst({
   *   where: { id: noteId, userId, deletedAt: null }
   * })
   * if (!note) {
   *   throw new Error('Note not found')
   * }
   * return await prisma.note.update({
   *   where: { id: noteId },
   *   data: { deletedAt: new Date() }
   * })
   * ```
   *
   * **After (1 line):**
   * ```typescript
   * return await this.softDelete(noteId, userId)
   * ```
   *
   * @param id - Record ID to delete
   * @param userId - Owner user ID
   * @throws {NotFoundError} if record not found or user doesn't own it
   * @returns The soft-deleted record
   */
  protected async softDelete(id: string, userId: string): Promise<T> {
    // Verify ownership first
    await this.findByIdWithOwnership(id, userId)

    // Perform soft delete
    return await this.prismaModel.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  /**
   * Count records for a user (excluding soft-deleted by default)
   *
   * **Usage:**
   * ```typescript
   * const noteCount = await this.countForUser(userId)
   * const totalIncludingDeleted = await this.countForUser(userId, { includeDeleted: true })
   * ```
   *
   * @param userId - Owner user ID
   * @param options - Optional configuration
   * @param options.includeDeleted - Include soft-deleted records (default: false)
   * @returns Number of records
   */
  protected async countForUser(
    userId: string,
    options?: { includeDeleted?: boolean }
  ): Promise<number> {
    return await this.prismaModel.count({
      where: {
        userId,
        ...(options?.includeDeleted ? {} : buildSoftDeleteFilter()),
      },
    })
  }

  /**
   * Find all records for a user (excluding soft-deleted by default)
   *
   * **Usage:**
   * ```typescript
   * const notes = await this.findAllForUser(userId)
   * const notesWithDeleted = await this.findAllForUser(userId, { includeDeleted: true })
   * ```
   *
   * @param userId - Owner user ID
   * @param options - Optional configuration
   * @param options.includeDeleted - Include soft-deleted records (default: false)
   * @param options.orderBy - Order by field and direction
   * @returns Array of records
   */
  protected async findAllForUser(
    userId: string,
    options?: {
      includeDeleted?: boolean
      orderBy?: { field: keyof T; direction: 'asc' | 'desc' }
    }
  ): Promise<T[]> {
    return await this.prismaModel.findMany({
      where: {
        userId,
        ...(options?.includeDeleted ? {} : buildSoftDeleteFilter()),
      },
      orderBy: options?.orderBy
        ? { [options.orderBy.field]: options.orderBy.direction }
        : undefined,
    })
  }
}
