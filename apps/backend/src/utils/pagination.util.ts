/**
 * Pagination Utility
 *
 * Standardized pagination helper for consistent API responses across all endpoints.
 * Provides query parsing, validation, and response formatting.
 *
 * @example
 * ```typescript
 * // In route handler
 * const paginationParams = parsePaginationParams(request.query)
 *
 * const [items, totalCount] = await Promise.all([
 *   prisma.user.findMany({
 *     ...paginationParams.prismaParams,
 *     where: { ... }
 *   }),
 *   prisma.user.count({ where: { ... } })
 * ])
 *
 * reply.send(buildPaginatedResponse(items, totalCount, paginationParams))
 * ```
 */

export interface PaginationQuery {
  page?: string
  limit?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginationParams {
  page: number
  limit: number
  skip: number
  sortBy?: string
  sortOrder: 'asc' | 'desc'
  prismaParams: {
    skip: number
    take: number
    orderBy?: Record<string, 'asc' | 'desc'>
  }
}

export interface PaginatedResponse<T> {
  success: true
  data: {
    items: T[]
    pagination: {
      page: number
      limit: number
      totalCount: number
      totalPages: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
}

/**
 * Parse and validate pagination query parameters
 *
 * @param query - Request query string parameters
 * @param options - Optional configuration
 * @param options.defaultLimit - Default items per page (default: 20)
 * @param options.maxLimit - Maximum items per page (default: 100)
 * @param options.defaultSortBy - Default sort field (default: 'createdAt')
 * @param options.defaultSortOrder - Default sort order (default: 'desc')
 * @returns Validated pagination parameters
 * @throws Error if page or limit are invalid
 */
export function parsePaginationParams(
  query: PaginationQuery,
  options?: {
    defaultLimit?: number
    maxLimit?: number
    defaultSortBy?: string
    defaultSortOrder?: 'asc' | 'desc'
  }
): PaginationParams {
  const defaultLimit = options?.defaultLimit ?? 20
  const maxLimit = options?.maxLimit ?? 100
  const defaultSortBy = options?.defaultSortBy ?? 'createdAt'
  const defaultSortOrder = options?.defaultSortOrder ?? 'desc'

  // Parse and validate page
  const page = parseInt(query.page || '1', 10)
  if (page < 1 || isNaN(page)) {
    throw new Error('Invalid page parameter: must be a positive integer')
  }

  // Parse and validate limit
  let limit = parseInt(query.limit || String(defaultLimit), 10)
  if (limit < 1 || isNaN(limit)) {
    throw new Error('Invalid limit parameter: must be a positive integer')
  }
  // Enforce max limit
  limit = Math.min(limit, maxLimit)

  // Calculate skip for database query
  const skip = (page - 1) * limit

  // Parse sort parameters
  const sortBy = query.sortBy || defaultSortBy
  const sortOrder = query.sortOrder === 'asc' ? 'asc' : defaultSortOrder

  return {
    page,
    limit,
    skip,
    sortBy,
    sortOrder,
    prismaParams: {
      skip,
      take: limit,
      orderBy: sortBy ? { [sortBy]: sortOrder } : undefined,
    },
  }
}

/**
 * Build standardized paginated response
 *
 * @param items - Array of items for current page
 * @param totalCount - Total number of items across all pages
 * @param paginationParams - Pagination parameters from parsePaginationParams
 * @returns Formatted paginated response
 */
export function buildPaginatedResponse<T>(
  items: T[],
  totalCount: number,
  paginationParams: PaginationParams
): PaginatedResponse<T> {
  const { page, limit } = paginationParams
  const totalPages = Math.ceil(totalCount / limit)

  return {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      },
    },
  }
}

/**
 * Execute paginated query with automatic count
 * Combines findMany + count into single helper
 *
 * @param findManyFn - Async function that executes findMany query
 * @param countFn - Async function that executes count query
 * @param paginationParams - Pagination parameters from parsePaginationParams
 * @returns Formatted paginated response
 *
 * @example
 * ```typescript
 * const response = await executePaginatedQuery(
 *   () => prisma.user.findMany({
 *     ...paginationParams.prismaParams,
 *     where: { emailVerified: true },
 *     select: { id: true, email: true }
 *   }),
 *   () => prisma.user.count({ where: { emailVerified: true } }),
 *   paginationParams
 * )
 * ```
 */
export async function executePaginatedQuery<T>(
  findManyFn: () => Promise<T[]>,
  countFn: () => Promise<number>,
  paginationParams: PaginationParams
): Promise<PaginatedResponse<T>> {
  const [items, totalCount] = await Promise.all([findManyFn(), countFn()])

  return buildPaginatedResponse(items, totalCount, paginationParams)
}
