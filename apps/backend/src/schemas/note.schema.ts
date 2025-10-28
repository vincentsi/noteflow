import { z } from 'zod'

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
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const searchNotesSchema = z.object({
  q: z
    .string()
    .min(1)
    .max(100, 'Search query must not exceed 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_.]*$/, 'Search query contains invalid characters'),
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export const noteIdSchema = z.object({
  id: z.string().min(1),
})

// TypeScript types
export type CreateNoteDTO = z.infer<typeof createNoteSchema>
export type UpdateNoteDTO = z.infer<typeof updateNoteSchema>
export type GetNotesDTO = z.infer<typeof getNotesSchema>
export type SearchNotesDTO = z.infer<typeof searchNotesSchema>
export type NoteIdDTO = z.infer<typeof noteIdSchema>
