/**
 * Pagination Types and Utilities
 *
 * Standardizes pagination across all API endpoints.
 * Eliminates inconsistencies between skip/take and page/limit patterns.
 *
 * **Problem:**
 * - Article service uses skip/take
 * - Summary service uses page/limit
 * - Note schema uses page/limit
 * Different patterns lead to confusion and bugs.
 *
 * **Solution:**
 * Standard page/limit pattern everywhere, with utilities to convert to Prisma's skip/take.
 */

/**
 * Pagination request parameters
 * Used in API query strings and service method parameters
 *
 * @example
 * ```typescript
 * // In route schema
 * querystring: {
 *   type: 'object',
 *   properties: {
 *     page: { type: 'number', minimum: 1, default: 1 },
 *     limit: { type: 'number', minimum: 1, maximum: 100, default: 20 },
 *   }
 * }
 * ```
 */
export interface PaginationParams {
  /** Page number (1-indexed). Default: 1 */
  page?: number
  /** Items per page. Default: 20, Max: 100 */
  limit?: number
}

/**
 * Pagination response metadata
 * Returned with paginated lists to help frontend build pagination UI
 *
 * @example
 * ```typescript
 * {
 *   success: true,
 *   data: {
 *     items: [...],
 *     pagination: {
 *       page: 1,
 *       limit: 20,
 *       total: 150,
 *       totalPages: 8
 *     }
 *   }
 * }
 * ```
 */
export interface PaginationResponse {
  /** Current page number */
  page: number
  /** Items per page */
  limit: number
  /** Total number of items across all pages */
  total: number
  /** Total number of pages */
  totalPages: number
}

/**
 * Converts page/limit to skip/take for Prisma queries
 *
 * **Before:**
 * ```typescript
 * const page = params.page ?? 1
 * const limit = params.limit ?? 20
 * const skip = (page - 1) * limit
 * const take = limit
 *
 * await prisma.article.findMany({ skip, take })
 * ```
 *
 * **After:**
 * ```typescript
 * const { skip, take } = paginationToSkipTake(params.pagination)
 * await prisma.article.findMany({ skip, take })
 * ```
 *
 * @param params - Pagination parameters (page/limit)
 * @returns Prisma-compatible skip/take values
 */
export function paginationToSkipTake(params: PaginationParams = {}): {
  skip: number
  take: number
} {
  const page = Math.max(1, params.page ?? 1) // Ensure page >= 1
  const limit = Math.min(100, Math.max(1, params.limit ?? 20)) // Clamp limit: 1-100

  return {
    skip: (page - 1) * limit,
    take: limit,
  }
}

/**
 * Calculates pagination metadata for API responses
 *
 * **Before:**
 * ```typescript
 * const page = params.page ?? 1
 * const limit = params.limit ?? 20
 * const totalPages = Math.ceil(total / limit)
 *
 * return {
 *   items,
 *   pagination: { page, limit, total, totalPages }
 * }
 * ```
 *
 * **After:**
 * ```typescript
 * return {
 *   items,
 *   pagination: calculatePagination(total, params.pagination)
 * }
 * ```
 *
 * @param total - Total number of items (from Prisma count())
 * @param params - Pagination parameters used in the query
 * @returns Complete pagination metadata
 */
export function calculatePagination(
  total: number,
  params: PaginationParams = {}
): PaginationResponse {
  const page = Math.max(1, params.page ?? 1)
  const limit = Math.min(100, Math.max(1, params.limit ?? 20))

  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

/**
 * Default pagination values
 * Use these constants for consistency across the codebase
 */
export const DEFAULT_PAGE = 1
export const DEFAULT_LIMIT = 20
export const MAX_LIMIT = 100
export const MIN_LIMIT = 1

/**
 * Validates pagination parameters
 * Ensures page and limit are within acceptable ranges
 *
 * @param params - Pagination parameters to validate
 * @returns Validated and clamped parameters
 *
 * @example
 * ```typescript
 * const params = validatePaginationParams({ page: 0, limit: 200 })
 * // Returns: { page: 1, limit: 100 }
 * ```
 */
export function validatePaginationParams(params: PaginationParams): Required<PaginationParams> {
  return {
    page: Math.max(MIN_LIMIT, params.page ?? DEFAULT_PAGE),
    limit: Math.min(MAX_LIMIT, Math.max(MIN_LIMIT, params.limit ?? DEFAULT_LIMIT)),
  }
}
