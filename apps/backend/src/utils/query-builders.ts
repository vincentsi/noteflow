import { Prisma } from '@prisma/client'

/**
 * Reusable query builders for common Prisma patterns
 * Eliminates duplication and provides consistent query construction
 */

/**
 * Build a text search WHERE clause for multiple fields
 * Case-insensitive search across specified fields
 *
 * @example
 * const where = buildTextSearch(search, ['title', 'excerpt', 'content'])
 * // Returns: { OR: [{ title: { contains: 'query', mode: 'insensitive' } }, ...] }
 */
export function buildTextSearch<T extends Record<string, unknown>>(
  query: string | undefined,
  fields: Array<keyof T>
): Prisma.XOR<Prisma.NoteWhereInput, Prisma.ArticleWhereInput> | undefined {
  if (!query || fields.length === 0) return undefined

  return {
    OR: fields.map((field) => ({
      [field]: {
        contains: query,
        mode: 'insensitive' as const,
      },
    })),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any
}

/**
 * Build a date range WHERE clause
 * Supports common time ranges: 24h, 7d, 30d
 *
 * @example
 * const where = buildDateRange('7d', 'publishedAt')
 * // Returns: { publishedAt: { gte: Date(now - 7 days) } }
 */
export function buildDateRange(
  range: '24h' | '7d' | '30d' | 'all' | undefined,
  field: string = 'createdAt'
): Record<string, { gte: Date }> | undefined {
  if (!range || range === 'all') return undefined

  const now = new Date()
  let startDate: Date

  switch (range) {
    case '24h':
      startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      break
    case '7d':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      break
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      break
  }

  return {
    [field]: {
      gte: startDate,
    },
  }
}

/**
 * Build a tags filter WHERE clause
 * Supports comma-separated tag lists
 *
 * @example
 * const where = buildTagsFilter('work,urgent')
 * // Returns: { tags: { hasSome: ['work', 'urgent'] } }
 */
export function buildTagsFilter(
  tags: string | string[] | undefined
): { tags: { hasSome: string[] } } | undefined {
  if (!tags) return undefined

  const tagList = typeof tags === 'string'
    ? tags.split(',').map((t) => t.trim()).filter(Boolean)
    : tags

  if (tagList.length === 0) return undefined

  return {
    tags: {
      hasSome: tagList,
    },
  }
}

/**
 * Build pagination options (skip/take)
 * Enforces max page size and validates input
 *
 * @example
 * const pagination = buildPagination(10, 50, 100)
 * // Returns: { skip: 10, take: 50 }
 */
export function buildPagination(
  skip: number = 0,
  take: number | undefined,
  defaultPageSize: number = 20,
  maxPageSize: number = 100
): { skip: number; take: number } {
  const limit = Math.min(
    take || defaultPageSize,
    maxPageSize
  )

  return {
    skip: Math.max(0, skip),
    take: limit,
  }
}

/**
 * Build orderBy clause with direction
 * Supports common sort patterns
 *
 * @example
 * const orderBy = buildOrderBy('publishedAt', 'desc')
 * // Returns: { publishedAt: 'desc' }
 */
export function buildOrderBy<T extends Record<string, unknown>>(
  field: keyof T,
  direction: 'asc' | 'desc' = 'desc'
): Record<string, 'asc' | 'desc'> {
  return {
    [field]: direction,
  }
}

/**
 * Build soft delete filter
 * Excludes soft-deleted records (deletedAt IS NULL)
 *
 * @example
 * const where = { ...otherFilters, ...buildSoftDeleteFilter() }
 * // Returns: { deletedAt: null }
 */
export function buildSoftDeleteFilter(
  includeDeleted: boolean = false
): { deletedAt: null } | undefined {
  if (includeDeleted) return undefined

  return {
    deletedAt: null,
  }
}

/**
 * Build month range filter
 * Returns start/end dates for the current month
 *
 * @example
 * const where = buildMonthRange('createdAt')
 * // Returns: { createdAt: { gte: Date(2025-01-01), lt: Date(2025-02-01) } }
 */
export function buildMonthRange(
  field: string = 'createdAt',
  date: Date = new Date()
): Record<string, { gte: Date; lt: Date }> {
  const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
  const startOfNextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1)

  return {
    [field]: {
      gte: startOfMonth,
      lt: startOfNextMonth,
    },
  }
}

/**
 * Build cache key from filters
 * Sorts object keys alphabetically to prevent cache key collision
 * Ensures { b: 1, a: 2 } and { a: 2, b: 1 } produce the same key
 *
 * @example
 * const key = buildCacheKey('articles:list', { source: 'rss', tags: 'tech' })
 * // Returns: 'articles:list:{"source":"rss","tags":"tech"}'
 */
export function buildCacheKey(
  prefix: string,
  filters: Record<string, unknown>
): string {
  const sortedKeys = Object.keys(filters).sort()
  const sortedFilters = sortedKeys.reduce(
    (acc, key) => {
      acc[key] = filters[key]
      return acc
    },
    {} as Record<string, unknown>
  )
  return `${prefix}:${JSON.stringify(sortedFilters)}`
}

// Note: mergeWhere was removed due to complex TypeScript typing issues with Prisma's XOR types
// Services should use object spread syntax instead:
// const where = { ...filter1, ...filter2, ...filter3 }
