import { z } from 'zod'

/**
 * Schema for getting all articles with filters
 */
export const getArticlesSchema = z.object({
  source: z.string().optional(),
  tags: z.string().optional(), // comma-separated tags
  search: z.string().optional(),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
})

export type GetArticlesDTO = z.infer<typeof getArticlesSchema>

/**
 * Schema for getting saved articles with filters
 */
export const getSavedArticlesSchema = z.object({
  source: z.string().optional(),
  skip: z.coerce.number().int().min(0).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
})

export type GetSavedArticlesDTO = z.infer<typeof getSavedArticlesSchema>

/**
 * Schema for saving an article
 */
export const saveArticleSchema = z.object({
  articleId: z.string().min(1, 'Article ID is required'),
})

export type SaveArticleDTO = z.infer<typeof saveArticleSchema>

/**
 * Schema for unsaving an article
 */
export const unsaveArticleSchema = z.object({
  articleId: z.string().min(1, 'Article ID is required'),
})

export type UnsaveArticleDTO = z.infer<typeof unsaveArticleSchema>
