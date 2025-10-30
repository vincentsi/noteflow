import { z } from 'zod'
import { searchQuerySchema, paginationSchema, idParamSchema } from './common.schema'

// Zod schemas
export const createNoteSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string(),
  tags: z.array(z.string()).default([]),
})

export const updateNoteSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  tags: z.array(z.string()).optional(),
})

export const getNotesSchema = z.object({
  tags: z
    .string()
    .optional()
    .transform(val => (val ? val.split(',') : undefined)),
  ...paginationSchema,
})

export const searchNotesSchema = z.object({
  q: searchQuerySchema.min(1, 'Search query is required'),
  ...paginationSchema,
})

export const noteIdSchema = idParamSchema

// TypeScript types
export type CreateNoteDTO = z.infer<typeof createNoteSchema>
export type UpdateNoteDTO = z.infer<typeof updateNoteSchema>
export type GetNotesDTO = z.infer<typeof getNotesSchema>
export type SearchNotesDTO = z.infer<typeof searchNotesSchema>
export type NoteIdDTO = z.infer<typeof noteIdSchema>
