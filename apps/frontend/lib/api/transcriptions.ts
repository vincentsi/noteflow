import { apiClient } from './client'
import type { ApiResponse } from './types'

export type Transcription = {
  id: string
  userId: string
  noteId: string | null
  fileName: string
  mimeType: string
  fileSize: number
  duration: number | null
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  text: string | null
  errorMsg: string | null
  createdAt: string
  updatedAt: string
}

export type TranscriptionUsage = {
  count: number
  limit: number
  remaining: number
}

export type TranscriptionsResponse = ApiResponse<{ transcriptions: Transcription[] }>
export type TranscriptionResponse = ApiResponse<Transcription>
export type TranscriptionUsageResponse = ApiResponse<TranscriptionUsage>

/**
 * Transcriptions API client
 * Manages audio transcriptions
 */
export const transcriptionsApi = {
  /**
   * Upload audio file for transcription
   */
  uploadAudio: async (file: File): Promise<Transcription> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await apiClient.post<TranscriptionResponse>(
      '/api/transcriptions',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data.data
  },

  /**
   * Get all user transcriptions
   */
  getTranscriptions: async (): Promise<Transcription[]> => {
    const response = await apiClient.get<TranscriptionsResponse>('/api/transcriptions')
    return response.data.data.transcriptions
  },

  /**
   * Get transcription usage for current month
   */
  getUsage: async (): Promise<TranscriptionUsage> => {
    const response = await apiClient.get<TranscriptionUsageResponse>(
      '/api/transcriptions/usage'
    )
    return response.data.data
  },

  /**
   * Get a single transcription by ID
   */
  getTranscription: async (id: string): Promise<Transcription> => {
    const response = await apiClient.get<TranscriptionResponse>(`/api/transcriptions/${id}`)
    return response.data.data
  },

  /**
   * Delete a transcription
   */
  deleteTranscription: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/transcriptions/${id}`)
  },
}
