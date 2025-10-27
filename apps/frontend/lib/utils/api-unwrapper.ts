/**
 * API Response Unwrapper Utility
 *
 * Eliminates the repetitive `.data.data` pattern when accessing API responses.
 * All backend API responses follow the format: { success: boolean, data: T }
 *
 * @example
 * ```typescript
 * // ❌ BAD: Repetitive unwrapping
 * const articles = response.data.data
 * const user = response.data.data.user
 *
 * // ✅ GOOD: Clean unwrapping
 * const articles = unwrap(response)
 * const user = unwrap(response).user
 * ```
 */

/**
 * Standard API response format from backend
 */
export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: unknown
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

/**
 * Unwraps the API response to extract the data
 *
 * @param response - Axios response object
 * @returns The data from response.data.data
 *
 * @example
 * ```typescript
 * // Articles API
 * const response = await api.get('/api/articles')
 * const articles = unwrap(response) // Type: Article[]
 *
 * // User API
 * const response = await api.get('/api/user')
 * const user = unwrap(response) // Type: User
 *
 * // With type annotation
 * const articles = unwrap<Article[]>(response)
 * ```
 */
export function unwrap<T = unknown>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.error || 'API request failed')
  }

  if (response.data.data === undefined) {
    throw new Error('API response missing data field')
  }

  return response.data.data
}

/**
 * Unwraps a paginated API response
 *
 * @param response - Axios response with pagination
 * @returns Object with data and pagination info
 *
 * @example
 * ```typescript
 * const response = await api.get('/api/summaries?page=1&limit=10')
 * const { data, pagination } = unwrapPaginated(response)
 * // data: Summary[]
 * // pagination: { page: 1, limit: 10, total: 50, totalPages: 5 }
 * ```
 */
export function unwrapPaginated<T = unknown>(response: {
  data: ApiResponse<T>
}): {
  data: T
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
} {
  if (!response.data.success) {
    throw new Error(response.data.error || 'API request failed')
  }

  if (response.data.data === undefined) {
    throw new Error('API response missing data field')
  }

  if (!response.data.pagination) {
    throw new Error('API response missing pagination field')
  }

  return {
    data: response.data.data,
    pagination: response.data.pagination,
  }
}

/**
 * Safely unwraps response, returns null if error
 *
 * @param response - Axios response
 * @returns Data or null
 *
 * @example
 * ```typescript
 * const articles = safeUnwrap(response) ?? []
 * const user = safeUnwrap(response) ?? defaultUser
 * ```
 */
export function safeUnwrap<T = unknown>(response: {
  data: ApiResponse<T>
}): T | null {
  try {
    return unwrap(response)
  } catch {
    return null
  }
}
