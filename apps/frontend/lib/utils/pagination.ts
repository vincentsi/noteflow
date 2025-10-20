export type PaginationParams = {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Build URL with pagination query parameters
 * Reduces code duplication across API endpoints
 *
 * @example
 * buildPaginationUrl('/api/admin/users', { page: 2, limit: 50, sortBy: 'email', sortOrder: 'asc' })
 * // Returns: '/api/admin/users?page=2&limit=50&sortBy=email&sortOrder=asc'
 */
export function buildPaginationUrl(
  endpoint: string,
  params?: PaginationParams
): string {
  if (!params) return endpoint

  const queryParams = new URLSearchParams()

  if (params.page) {
    queryParams.append('page', params.page.toString())
  }

  if (params.limit) {
    queryParams.append('limit', params.limit.toString())
  }

  if (params.sortBy) {
    queryParams.append('sortBy', params.sortBy)
  }

  if (params.sortOrder) {
    queryParams.append('sortOrder', params.sortOrder)
  }

  const queryString = queryParams.toString()
  return queryString ? `${endpoint}?${queryString}` : endpoint
}
