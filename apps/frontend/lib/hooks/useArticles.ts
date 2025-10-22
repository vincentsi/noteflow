import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { articlesApi, type GetArticlesParams, type GetSavedArticlesParams } from '@/lib/api/articles'
import type { Article, SavedArticle } from '@/types'

/**
 * Query key for articles cache
 */
export const articlesKeys = {
  all: ['articles'] as const,
  list: (filters?: GetArticlesParams) => [...articlesKeys.all, 'list', filters] as const,
  sources: () => [...articlesKeys.all, 'sources'] as const,
  saved: (filters?: GetSavedArticlesParams) => [...articlesKeys.all, 'saved', filters] as const,
}

/**
 * Hook to fetch all articles (for Veille page)
 * Uses TanStack Query for caching and automatic refetching
 */
export function useAllArticles(params?: GetArticlesParams) {
  return useQuery<Article[], Error>({
    queryKey: articlesKeys.list(params),
    queryFn: () => articlesApi.getArticles(params),
  })
}

/**
 * Hook to fetch article sources
 * Uses TanStack Query for caching
 */
export function useArticleSources() {
  return useQuery<string[], Error>({
    queryKey: articlesKeys.sources(),
    queryFn: () => articlesApi.getSources(),
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
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
