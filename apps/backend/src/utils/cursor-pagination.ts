import { z } from 'zod'

/**
 * Cursor-based Pagination Utility
 *
 * More efficient than offset pagination for large datasets:
 * - Offset: SELECT * FROM table LIMIT 10 OFFSET 10000 (scans 10k rows)
 * - Cursor: SELECT * FROM table WHERE id > 'cursor' LIMIT 10 (uses index)
 *
 * Benefits:
 * - Constant performance regardless of page depth
 * - No duplicate/missing items when data changes
 * - Better for real-time feeds
 *
 * Trade-offs:
 * - Can't jump to arbitrary page numbers
 * - Only forward/backward navigation
 *
 * @example
 * ```typescript
 * // First page
 * const result = await getCursorPaginatedItems({
 *   cursor: null,
 *   limit: 20,
 *   where: { userId: 'user_123' },
 *   orderBy: { createdAt: 'desc' },
 * })
 *
 * // Next page
 * const nextPage = await getCursorPaginatedItems({
 *   cursor: result.nextCursor,
 *   limit: 20,
 *   where: { userId: 'user_123' },
 *   orderBy: { createdAt: 'desc' },
 * })
 * ```
 */

/**
 * Cursor format: base64(id:timestamp)
 * Example: "Y21oYXJuMTIzOjE3MDAwMDAwMDA="
 */
export function encodeCursor(id: string, timestamp: Date): string {
  const cursorString = `${id}:${timestamp.getTime()}`
  return Buffer.from(cursorString).toString('base64')
}

export function decodeCursor(cursor: string): { id: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8')
    const [id, timestampStr] = decoded.split(':')

    if (!id || !timestampStr) {
      return null
    }

    const timestamp = parseInt(timestampStr, 10)

    if (isNaN(timestamp)) {
      return null
    }

    return { id, timestamp }
  } catch {
    return null
  }
}

/**
 * Cursor pagination schema for validation
 */
export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
})

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>

/**
 * Generic cursor pagination result
 */
export interface CursorPaginationResult<T> {
  items: T[]
  nextCursor: string | null
  prevCursor: string | null
  hasMore: boolean
}

/**
 * Build cursor-based WHERE clause for Prisma
 *
 * @param cursor - Cursor string from client
 * @param direction - 'forward' or 'backward'
 * @returns Prisma cursor object or null
 */
export function buildCursorWhere(
  cursor: string | null | undefined,
  _direction: 'forward' | 'backward' = 'forward'
): { cursor?: { id: string }; skip?: number } {
  if (!cursor) {
    return {}
  }

  const decoded = decodeCursor(cursor)
  if (!decoded) {
    return {}
  }

  return {
    cursor: { id: decoded.id },
    skip: 1, // Skip the cursor item itself
  }
}

/**
 * Create cursor pagination response
 *
 * @param items - Items from database query
 * @param limit - Requested limit
 * @param getId - Function to extract ID from item
 * @param getTimestamp - Function to extract timestamp from item
 */
export function createCursorResponse<T>(
  items: T[],
  limit: number,
  getId: (item: T) => string,
  getTimestamp: (item: T) => Date
): CursorPaginationResult<T> {
  const hasMore = items.length > limit
  const resultItems = hasMore ? items.slice(0, limit) : items

  const lastItem = resultItems[resultItems.length - 1]
  const firstItem = resultItems[0]

  const nextCursor =
    hasMore && lastItem
      ? encodeCursor(getId(lastItem), getTimestamp(lastItem))
      : null

  const prevCursor =
    firstItem
      ? encodeCursor(getId(firstItem), getTimestamp(firstItem))
      : null

  return {
    items: resultItems,
    nextCursor,
    prevCursor,
    hasMore,
  }
}

/**
 * Example usage with Prisma
 *
 * ```typescript
 * async function getArticles(cursor?: string, limit = 20) {
 *   const cursorWhere = buildCursorWhere(cursor)
 *
 *   const articles = await prisma.article.findMany({
 *     ...cursorWhere,
 *     take: limit + 1, // Fetch one extra to check hasMore
 *     orderBy: { createdAt: 'desc' },
 *   })
 *
 *   return createCursorResponse(
 *     articles,
 *     limit,
 *     (article) => article.id,
 *     (article) => article.createdAt
 *   )
 * }
 * ```
 */
