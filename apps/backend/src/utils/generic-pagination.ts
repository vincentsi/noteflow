/**
 * Generic Pagination Helper
 *
 * Provides a reusable pagination pattern for Prisma queries
 * Eliminates code duplication across services
 *
 * Features:
 * - Parallel execution (findMany + count)
 * - Type-safe results
 * - Flexible filtering and sorting
 * - Standard pagination metadata
 *
 * Usage:
 * ```typescript
 * const result = await paginateQuery(prisma.article, {
 *   where: { userId },
 *   orderBy: { createdAt: 'desc' },
 *   page: 1,
 *   limit: 20,
 * })
 * // Returns: { data, total, page, limit, totalPages, hasNext, hasPrev }
 * ```
 */

/**
 * Pagination options
 */
export interface PaginationOptions {
  page: number // Current page (1-indexed)
  limit: number // Items per page
  where?: unknown // Prisma where clause
  include?: unknown // Prisma include clause
  select?: unknown // Prisma select clause
  orderBy?: unknown // Prisma orderBy clause
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[] // Items for current page
  total: number // Total items count
  page: number // Current page number
  limit: number // Items per page
  totalPages: number // Total number of pages
  hasNext: boolean // Has next page
  hasPrev: boolean // Has previous page
}

/**
 * Paginate a Prisma query
 *
 * @param model - Prisma model delegate (e.g., prisma.article)
 * @param options - Pagination options
 * @returns Paginated result with metadata
 *
 * @example
 * ```typescript
 * // Paginate saved articles
 * const result = await paginateQuery(prisma.savedArticle, {
 *   where: { userId: 'user-123', deletedAt: null },
 *   include: { article: true },
 *   orderBy: { createdAt: 'desc' },
 *   page: 1,
 *   limit: 20,
 * })
 *
 * // Access data
 * console.log(result.data) // Array of saved articles
 * console.log(`Page ${result.page} of ${result.totalPages}`)
 * console.log(`Has next: ${result.hasNext}`)
 * ```
 */
export async function paginateQuery<T>(
  model: PrismaModel,
  options: PaginationOptions
): Promise<PaginatedResult<T>> {
  const { page, limit, where, include, select, orderBy } = options

  // Calculate skip
  const skip = (page - 1) * limit

  // Execute query and count in parallel (performance optimization)
  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      select,
      orderBy,
      skip,
      take: limit,
    }),
    model.count({ where }),
  ])

  // Calculate metadata
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    data: data as T[],
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  }
}

/**
 * Paginate with custom query function
 * Useful when you need more complex queries
 *
 * @param queryFn - Function that executes the query
 * @param countFn - Function that counts total items
 * @param page - Current page
 * @param limit - Items per page
 * @returns Paginated result
 *
 * @example
 * ```typescript
 * // Complex query with raw SQL or aggregations
 * const result = await paginateCustom(
 *   () => prisma.$queryRaw`SELECT * FROM articles WHERE ...`,
 *   () => prisma.$queryRaw`SELECT COUNT(*) FROM articles WHERE ...`,
 *   1,
 *   20
 * )
 * ```
 */
export async function paginateCustom<T>(
  queryFn: (skip: number, take: number) => Promise<T[]>,
  countFn: () => Promise<number>,
  page: number,
  limit: number
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * limit

  // Execute in parallel
  const [data, total] = await Promise.all([queryFn(skip, limit), countFn()])

  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    data,
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  }
}

/**
 * Build pagination metadata without executing query
 * Useful for lightweight metadata generation
 *
 * @param total - Total items count
 * @param page - Current page
 * @param limit - Items per page
 * @returns Pagination metadata only
 *
 * @example
 * ```typescript
 * const meta = buildPaginationMeta(150, 3, 20)
 * // { page: 3, limit: 20, total: 150, totalPages: 8, hasNext: true, hasPrev: true }
 * ```
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number
): Omit<PaginatedResult<never>, 'data'> {
  const totalPages = Math.ceil(total / limit)
  const hasNext = page < totalPages
  const hasPrev = page > 1

  return {
    total,
    page,
    limit,
    totalPages,
    hasNext,
    hasPrev,
  }
}

/**
 * Validate pagination parameters
 * Ensures page and limit are within safe bounds
 *
 * @param page - Page number
 * @param limit - Items per page
 * @param maxLimit - Maximum allowed limit (default: 100)
 * @throws Error if parameters are invalid
 *
 * @example
 * ```typescript
 * validatePaginationParams(1, 20) // OK
 * validatePaginationParams(0, 20) // Throws: "Page must be >= 1"
 * validatePaginationParams(1, 200) // Throws: "Limit must be <= 100"
 * ```
 */
export function validatePaginationParams(
  page: number,
  limit: number,
  maxLimit: number = 100
): void {
  if (page < 1) {
    throw new Error('Page must be >= 1')
  }

  if (page > 1000) {
    throw new Error('Page must be <= 1000')
  }

  if (limit < 1) {
    throw new Error('Limit must be >= 1')
  }

  if (limit > maxLimit) {
    throw new Error(`Limit must be <= ${maxLimit}`)
  }
}

/**
 * Helper type for Prisma model delegates
 * Used for type inference in pagination functions
 */
export type PrismaModel = {
  findMany: (args: unknown) => Promise<unknown[]>
  count: (args: unknown) => Promise<number>
}
