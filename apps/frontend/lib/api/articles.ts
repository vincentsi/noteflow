import { apiClient } from './client'
import type { SavedArticle } from '@/types'

export type GetSavedArticlesParams = {
  source?: string
  skip?: number
  take?: number
}

export type SavedArticlesResponse = {
  success: boolean
  data: SavedArticle[]
}

export type SaveArticleResponse = {
  success: boolean
  message: string
}

/**
 * Articles API client
 * Manages RSS feed articles and saved articles
 */
export const articlesApi = {
  /**
   * Get user's saved articles
   */
  getSavedArticles: async (params?: GetSavedArticlesParams): Promise<SavedArticle[]> => {
    const response = await apiClient.get<SavedArticlesResponse>('/api/articles/saved', {
      params,
    })
    return response.data.data
  },

  /**
   * Save an article
   */
  saveArticle: async (articleId: string): Promise<void> => {
    await apiClient.post<SaveArticleResponse>(`/api/articles/${articleId}/save`)
  },

  /**
   * Unsave an article
   */
  unsaveArticle: async (articleId: string): Promise<void> => {
    await apiClient.delete<SaveArticleResponse>(`/api/articles/${articleId}/unsave`)
  },
}
