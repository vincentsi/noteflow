import { z } from 'zod'

/**
 * Common Schema Definitions
 *
 * Reusable Zod schemas for consistent validation across the application.
 * Prevents duplicate validation logic and ensures security best practices.
 *
 * @ai-prompt When using these schemas:
 * - ALWAYS use searchQuerySchema for user-generated search inputs
 * - NEVER allow unvalidated search queries (prevents injection attacks)
 * - Search regex blocks special characters that could cause issues
 * - Max length prevents DoS attacks from extremely long queries
 * - Pagination limits prevent resource exhaustion
 *
 * @example
 * ```typescript
 * import { searchQuerySchema, paginationSchema } from '@/schemas/common.schema'
 *
 * const getNotesSchema = z.object({
 *   search: searchQuerySchema.optional(),
 *   ...paginationSchema,
 * })
 * ```
 */

/**
 * Search Query Schema
 *
 * Standardized validation for all search inputs across the application.
 *
 * Security measures:
 * - Max 200 characters (prevents DoS from extremely long queries)
 * - Alphanumeric + basic punctuation only (prevents injection attempts)
 * - Allows: letters, numbers, spaces, hyphens, underscores, periods, commas, quotes, exclamation, question marks
 * - Blocks: semicolons, parentheses, angle brackets, SQL operators, etc.
 *
 * Use cases:
 * - Article search
 * - Note search
 * - Summary search
 * - Any user-generated search input
 */
export const searchQuerySchema = z
  .string()
  .max(200, 'Search query must not exceed 200 characters')
  .regex(/^[a-zA-Z0-9\s\-_.,!?'"]*$/, 'Search query contains invalid characters')

/**
 * Pagination Schema (page/limit pattern)
 *
 * Standardized pagination for modern APIs.
 * Use this for new endpoints.
 *
 * Validation:
 * - page: 1-1000 (prevents excessive pagination)
 * - limit: 1-100 (balances performance vs UX)
 *
 * Example:
 * - page=1, limit=20 → items 1-20
 * - page=2, limit=20 → items 21-40
 */
export const paginationSchema = {
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}

/**
 * Legacy Pagination Schema (skip/take pattern)
 *
 * For backward compatibility with existing endpoints.
 * New endpoints should use paginationSchema instead.
 *
 * Validation:
 * - skip: 0+ (offset from beginning)
 * - take: 1-100 (number of items to return)
 */
export const legacyPaginationSchema = {
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
}

/**
 * ID Parameter Schema
 *
 * Standardized validation for resource IDs in URL parameters.
 * Ensures IDs are non-empty strings.
 */
export const idParamSchema = z.object({
  id: z.string().min(1, 'ID is required'),
})

/**
 * Date Range Filter Schema
 *
 * Standardized time-based filtering for content (articles, summaries, etc.)
 */
export const dateRangeSchema = z.enum(['24h', '7d', '30d', 'all'])

/**
 * Type exports for TypeScript
 */
export type SearchQuery = z.infer<typeof searchQuerySchema>
export type Pagination = z.infer<z.ZodObject<typeof paginationSchema>>
export type LegacyPagination = z.infer<z.ZodObject<typeof legacyPaginationSchema>>
export type IdParam = z.infer<typeof idParamSchema>
export type DateRange = z.infer<typeof dateRangeSchema>
