import { z } from 'zod'

/**
 * Schema for creating a summary template
 */
export const createTemplateSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Template name is required')
      .max(100, 'Template name must be less than 100 characters')
      .trim(),
    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .trim()
      .optional(),
    prompt: z
      .string()
      .min(10, 'Prompt must be at least 10 characters')
      .max(2000, 'Prompt must be less than 2000 characters')
      .trim(),
    icon: z.string().max(10, 'Icon must be less than 10 characters').trim().optional(),
  }),
})

/**
 * Schema for updating a summary template
 */
export const updateTemplateSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid template ID'),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, 'Template name is required')
      .max(100, 'Template name must be less than 100 characters')
      .trim()
      .optional(),
    description: z
      .string()
      .max(500, 'Description must be less than 500 characters')
      .trim()
      .optional()
      .nullable(),
    prompt: z
      .string()
      .min(10, 'Prompt must be at least 10 characters')
      .max(2000, 'Prompt must be less than 2000 characters')
      .trim()
      .optional(),
    icon: z.string().max(10, 'Icon must be less than 10 characters').trim().optional().nullable(),
  }),
})

/**
 * Schema for deleting a summary template
 */
export const deleteTemplateSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid template ID'),
  }),
})

/**
 * Schema for getting a single template
 */
export const getTemplateSchema = z.object({
  params: z.object({
    id: z.string().cuid('Invalid template ID'),
  }),
})

/**
 * TypeScript types
 */
export type CreateTemplateBody = z.infer<typeof createTemplateSchema>['body']
export type UpdateTemplateBody = z.infer<typeof updateTemplateSchema>['body']
