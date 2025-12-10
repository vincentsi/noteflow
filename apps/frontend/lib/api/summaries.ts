import { apiClient } from './client'
import type { ApiResponse } from './types'

export type SummaryStyle = 'SHORT' | 'TWEET' | 'THREAD' | 'BULLET_POINT' | 'TOP3' | 'MAIN_POINTS' | 'EDUCATIONAL'

export type Summary = {
  id: string
  title: string | null
  originalText: string
  summaryText: string
  style: SummaryStyle
  source: string | null
  language: string
  createdAt: string
}

export type CreateSummaryParams = {
  text?: string
  file?: File
  style: SummaryStyle
  language?: 'fr' | 'en'
}

export type CreateSummaryResponse = ApiResponse<{
  jobId: string
  message?: string
}>

export type SummaryStatusResponse = ApiResponse<{
  status: 'waiting' | 'active' | 'completed' | 'failed'
  jobId?: string
  summary?: Summary
}>

export type GetSummariesResponse = ApiResponse<{
  summaries: Summary[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    totalThisMonth: number
  }
}>

export type GetSummaryByIdResponse = ApiResponse<{
  summary: Summary
}>

export type PreviewURLResponse = ApiResponse<{
  title: string
  content: string
  wordCount: number
  charCount: number
}>

/**
 * Summaries API client
 * Manages AI-powered summary generation
 */
export const summariesApi = {
  /**
   * Preview URL content before creating summary
   */
  previewURL: async (url: string): Promise<PreviewURLResponse> => {
    const response = await apiClient.post<PreviewURLResponse>('/api/summaries/preview', { url })
    return response.data
  },
  /**
   * Create a new summary generation job
   */
  createSummary: async (params: CreateSummaryParams): Promise<CreateSummaryResponse> => {
    // If file is provided, use FormData
    if (params.file) {
      const formData = new FormData()
      formData.append('file', params.file)
      formData.append('style', params.style)
      if (params.language) {
        formData.append('language', params.language)
      }

      const response = await apiClient.post<CreateSummaryResponse>('/api/summaries', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for PDF uploads
      })
      return response.data
    }

    // Otherwise, send JSON
    const response = await apiClient.post<CreateSummaryResponse>('/api/summaries', {
      text: params.text,
      style: params.style,
      language: params.language,
    })
    return response.data
  },

  /**
   * Get summary job status
   */
  getSummaryStatus: async (jobId: string): Promise<SummaryStatusResponse> => {
    const response = await apiClient.get<SummaryStatusResponse>(`/api/summaries/${jobId}/status`)
    return response.data
  },

  /**
   * Get a single summary by ID
   */
  getSummaryById: async (id: string): Promise<GetSummaryByIdResponse> => {
    const response = await apiClient.get<GetSummaryByIdResponse>(`/api/summaries/${id}`)
    return response.data
  },

  /**
   * Get user's summary history
   */
  getSummaries: async (params?: { page?: number; limit?: number }): Promise<GetSummariesResponse> => {
    const response = await apiClient.get<GetSummariesResponse>('/api/summaries', {
      params,
    })
    return response.data
  },

  /**
   * Delete a summary by ID
   */
  deleteSummary: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    const response = await apiClient.delete<ApiResponse<{ message: string }>>(`/api/summaries/${id}`)
    return response.data
  },

  /**
   * Create a summary from an existing note
   */
  createSummaryFromNote: async (params: {
    noteId: string
    style: SummaryStyle
    language?: 'fr' | 'en'
  }): Promise<CreateSummaryResponse> => {
    const response = await apiClient.post<CreateSummaryResponse>('/api/summaries/from-note', params)
    return response.data
  },

  /**
   * Enable public sharing for a summary
   */
  enableSharing: async (id: string): Promise<ApiResponse<{ shareToken: string; shareUrl: string }>> => {
    const response = await apiClient.post<ApiResponse<{ shareToken: string; shareUrl: string }>>(`/api/summaries/${id}/share`)
    return response.data
  },

  /**
   * Get public summary by share token (no auth required)
   */
  getPublicSummary: async (token: string): Promise<ApiResponse<{ summary: Summary }>> => {
    const response = await apiClient.get<ApiResponse<{ summary: Summary }>>(`/api/public/summaries/${token}`)
    return response.data
  },
}
