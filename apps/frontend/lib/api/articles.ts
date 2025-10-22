import { apiClient } from './client'
import type { SavedArticle, Article } from '@/types'

export type GetArticlesParams = {
  source?: string
  tags?: string
  search?: string
  skip?: number
  take?: number
}

export type GetSavedArticlesParams = {
  source?: string
  skip?: number
  take?: number
}

export type ArticlesResponse = {
  success: boolean
  data: Article[]
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
   * Get all articles (for Veille page)
   */
  getArticles: async (params?: GetArticlesParams): Promise<Article[]> => {
    const response = await apiClient.get<ArticlesResponse>('/api/articles', {
      params,
    })
    return response.data.data
  },

  /**
   * Get list of article sources
   */
  getSources: async (): Promise<string[]> => {
    const response = await apiClient.get<{ success: boolean; data: string[] }>('/api/articles/sources')
    return response.data.data
  },

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
