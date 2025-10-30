import { apiClient } from './client'
import type { SavedArticle, Article } from '@/types'
import type { ApiResponse, ApiListResponse } from './types'

export type GetArticlesParams = {
  source?: string
  tags?: string
  search?: string
  dateRange?: '24h' | '7d' | '30d' | 'all'
  skip?: number
  take?: number
}

export type GetSavedArticlesParams = {
  source?: string
  skip?: number
  take?: number
}

export type ArticlesResponse = ApiListResponse<Article[]>

export type SavedArticlesResponse = ApiResponse<SavedArticle[]>

export type SaveArticleResponse = ApiResponse<{ message: string }>

export type ArticlesWithTotal = {
  articles: Article[]
  total: number
}

/**
 * Articles API client
 * Manages RSS feed articles and saved articles
 */
export const articlesApi = {
  /**
   * Get all articles (for Veille page)
   */
  getArticles: async (params?: GetArticlesParams): Promise<ArticlesWithTotal> => {
    const response = await apiClient.get<ArticlesResponse>('/api/articles', {
      params,
    })
    return {
      articles: response.data.data,
      total: response.data.total ?? 0,
    }
  },

  /**
   * Get list of article sources
   */
  getSources: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>('/api/articles/sources')
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
