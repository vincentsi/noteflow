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
