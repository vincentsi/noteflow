/**
 * Shared API Types
 *
 * Centralized type definitions for API requests and responses.
 * Eliminates duplication across API files and improves type safety.
 */

/**
 * Standard API response wrapper
 * All API endpoints return this structure
 *
 * @example
 * ```typescript
 * type UserResponse = ApiResponse<User>
 * // { success: true, data: User }
 * ```
 */
export interface ApiResponse<T> {
  success: boolean
  data: T
}

/**
 * API response with list of items and total count
 * Used for simple lists without pagination
 *
 * @example
 * ```typescript
 * type ArticlesResponse = ApiListResponse<Article[]>
 * // { success: true, data: Article[], total: 100 }
 * ```
 */
export interface ApiListResponse<T> extends ApiResponse<T> {
  total?: number
}

/**
 * Pagination metadata returned by paginated endpoints
 */
export interface PaginationInfo {
  page: number
  limit: number
  total: number
  totalPages: number
}

/**
 * API response with paginated data
 * Used for endpoints with page/limit parameters
 *
 * @example
 * ```typescript
 * type NotesResponse = ApiPaginatedResponse<Note>
 * // {
 * //   success: true,
 * //   data: Note[],
 * //   pagination: { page: 1, limit: 20, total: 100, totalPages: 5 }
 * // }
 * ```
 */
export interface ApiPaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: PaginationInfo
}

/**
 * API Error Response
 * Structured error returned by backend on failures
 *
 * @example
 * ```typescript
 * {
 *   success: false,
 *   error: 'ValidationError',
 *   message: 'Email is required',
 *   details: { field: 'email' }
 * }
 * ```
 */
export interface ApiErrorResponse {
  success: false
  error: string
  message?: string
  details?: unknown
}

/**
 * API Error (Axios/Fetch wrapper)
 * Error thrown by HTTP client when request fails
 *
 * @example
 * ```typescript
 * catch (error: unknown) {
 *   if (isApiError(error)) {
 *     console.log(error.response?.data.error) // Type-safe!
 *   }
 * }
 * ```
 */
export interface ApiError {
  response?: {
    status: number
    statusText?: string
    data: ApiErrorResponse
  }
  message?: string
}

/**
 * Type guard to check if an error is an API error
 *
 * **Before:**
 * ```typescript
 * catch (error: unknown) {
 *   const errorData = (error as { response?: { data?: { error?: string } } })?.response?.data
 *   const message = errorData?.error || 'Unknown error'
 * }
 * ```
 *
 * **After:**
 * ```typescript
 * catch (error: unknown) {
 *   if (isApiError(error)) {
 *     const message = error.response?.data.error || 'Unknown error'
 *   } else {
 *     console.error('Non-API error:', error)
 *   }
 * }
 * ```
 *
 * @param error - Unknown error from catch block
 * @returns true if error is an ApiError
 */
export function isApiError(error: unknown): error is ApiError {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  if (!('response' in error)) {
    return false
  }

  const apiError = error as ApiError

  if (typeof apiError.response !== 'object' || apiError.response === null) {
    return false
  }

  if (!('data' in apiError.response)) {
    return false
  }

  return typeof apiError.response.data === 'object' && apiError.response.data !== null
}

/**
 * Extract error message from an API error with fallback
 *
 * **Usage:**
 * ```typescript
 * catch (error: unknown) {
 *   const message = getApiErrorMessage(error, 'Failed to load data')
 *   toast.error(message)
 * }
 * ```
 *
 * @param error - Unknown error from catch block
 * @param fallback - Default message if error parsing fails
 * @returns Error message string
 */
export function getApiErrorMessage(error: unknown, fallback: string = 'An error occurred'): string {
  if (isApiError(error)) {
    return error.response?.data.error || error.response?.data.message || fallback
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

/**
 * Check if error is a specific HTTP status code
 *
 * @example
 * ```typescript
 * if (isApiErrorWithStatus(error, 401)) {
 *   // Redirect to login
 * }
 * ```
 */
export function isApiErrorWithStatus(error: unknown, status: number): error is ApiError {
  return isApiError(error) && error.response?.status === status
}

/**
 * Check if error is unauthorized (401)
 */
export function isUnauthorizedError(error: unknown): error is ApiError {
  return isApiErrorWithStatus(error, 401)
}

/**
 * Check if error is forbidden (403)
 */
export function isForbiddenError(error: unknown): error is ApiError {
  return isApiErrorWithStatus(error, 403)
}

/**
 * Check if error is not found (404)
 */
export function isNotFoundError(error: unknown): error is ApiError {
  return isApiErrorWithStatus(error, 404)
}

/**
 * Check if error is rate limit (429)
 */
export function isRateLimitError(error: unknown): error is ApiError {
  return isApiErrorWithStatus(error, 429)
}
