import { z } from 'zod'
import { SummaryStyle } from '@prisma/client'

// Re-export SummaryStyle for convenience
export { SummaryStyle }

/**
 * Schema for creating a summary
 */
export const createSummarySchema = z.object({
  text: z.string().min(10, 'Text must be at least 10 characters'),
  style: z.nativeEnum(SummaryStyle),
  language: z.enum(['fr', 'en']).optional(),
})

export type CreateSummaryDTO = z.infer<typeof createSummarySchema>

/**
 * Schema for getting summaries with pagination
 */
export const getSummariesSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type GetSummariesDTO = z.infer<typeof getSummariesSchema>
