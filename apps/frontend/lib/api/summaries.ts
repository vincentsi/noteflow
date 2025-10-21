import { apiClient } from './client'

export type SummaryStyle = 'SHORT' | 'TWEET' | 'THREAD' | 'BULLET_POINT' | 'TOP3' | 'MAIN_POINTS'

export type CreateSummaryParams = {
  text?: string
  file?: File
  style: SummaryStyle
  language?: 'fr' | 'en'
}

export type CreateSummaryResponse = {
  success: boolean
  data: {
    jobId: string
    message?: string
  }
}

export type SummaryStatusResponse = {
  success: boolean
  data: {
    status: 'waiting' | 'active' | 'completed' | 'failed'
    jobId?: string
    summary?: {
      id: string
      title: string | null
      originalText: string
      summaryText: string
      style: SummaryStyle
      source: string | null
      language: string
      createdAt: string
    }
  }
}

export type GetSummariesResponse = {
  success: boolean
  data: {
    summaries: Array<{
      id: string
      title: string | null
      originalText: string
      summaryText: string
      style: SummaryStyle
      source: string | null
      language: string
      createdAt: string
    }>
    pagination: {
      page: number
      limit: number
      total: number
      totalPages: number
    }
  }
}

/**
 * Summaries API client
 * Manages AI-powered summary generation
 */
export const summariesApi = {
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
   * Get user's summary history
   */
  getSummaries: async (params?: { page?: number; limit?: number }): Promise<GetSummariesResponse> => {
    const response = await apiClient.get<GetSummariesResponse>('/api/summaries', {
      params,
    })
    return response.data
  },
}
