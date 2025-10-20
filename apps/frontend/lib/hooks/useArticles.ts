import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articlesApi, type GetSavedArticlesParams } from '@/lib/api/articles'
import type { SavedArticle } from '@/types'

/**
 * Query key for articles cache
 */
export const articlesKeys = {
  all: ['articles'] as const,
  saved: (filters?: GetSavedArticlesParams) => [...articlesKeys.all, 'saved', filters] as const,
}

/**
 * Hook to fetch user's saved articles
 * Uses TanStack Query for caching and automatic refetching
 */
export function useArticles(params?: GetSavedArticlesParams) {
  return useQuery<SavedArticle[], Error>({
    queryKey: articlesKeys.saved(params),
    queryFn: () => articlesApi.getSavedArticles(params),
  })
}

/**
 * Hook to save an article
 * Automatically invalidates the saved articles cache on success
 */
export function useSaveArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (articleId: string) => articlesApi.saveArticle(articleId),
    onSuccess: () => {
      // Invalidate all saved articles queries to refetch
      queryClient.invalidateQueries({ queryKey: articlesKeys.all })
    },
  })
}

/**
 * Hook to unsave an article
 * Automatically invalidates the saved articles cache on success
 */
export function useUnsaveArticle() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (articleId: string) => articlesApi.unsaveArticle(articleId),
    onSuccess: () => {
      // Invalidate all saved articles queries to refetch
      queryClient.invalidateQueries({ queryKey: articlesKeys.all })
    },
  })
}
