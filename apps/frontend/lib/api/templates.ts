import { apiClient } from './client'
import type { ApiResponse } from './types'

export type SummaryTemplate = {
  id: string
  name: string
  description: string | null
  prompt: string
  icon: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export type CreateTemplateParams = {
  name: string
  description?: string
  prompt: string
  icon?: string
}

export type UpdateTemplateParams = {
  name?: string
  description?: string | null
  prompt?: string
  icon?: string | null
}

export type GetTemplatesResponse = ApiResponse<{
  templates: SummaryTemplate[]
}>

export type GetTemplateResponse = ApiResponse<SummaryTemplate>

export type CreateTemplateResponse = ApiResponse<SummaryTemplate>

export type UpdateTemplateResponse = ApiResponse<SummaryTemplate>

export type TemplateQuotaResponse = ApiResponse<{
  quota: {
    used: number
    limit: number | 'unlimited'
    remaining: number | 'unlimited'
  }
}>

/**
 * Templates API client
 * Manages custom summary templates
 */
export const templatesApi = {
  /**
   * Get all templates (custom + system defaults)
   */
  getTemplates: async (): Promise<GetTemplatesResponse> => {
    const response = await apiClient.get<GetTemplatesResponse>('/api/templates')
    return response.data
  },

  /**
   * Get a single template by ID
   */
  getTemplateById: async (id: string): Promise<GetTemplateResponse> => {
    const response = await apiClient.get<GetTemplateResponse>(`/api/templates/${id}`)
    return response.data
  },

  /**
   * Create a new custom template
   */
  createTemplate: async (params: CreateTemplateParams): Promise<CreateTemplateResponse> => {
    const response = await apiClient.post<CreateTemplateResponse>('/api/templates', params)
    return response.data
  },

  /**
   * Update a template
   */
  updateTemplate: async (id: string, params: UpdateTemplateParams): Promise<UpdateTemplateResponse> => {
    const response = await apiClient.patch<UpdateTemplateResponse>(`/api/templates/${id}`, params)
    return response.data
  },

  /**
   * Delete a template
   */
  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/templates/${id}`)
  },

  /**
   * Get template quota for current plan
   */
  getQuota: async (): Promise<TemplateQuotaResponse> => {
    const response = await apiClient.get<TemplateQuotaResponse>('/api/templates/quota')
    return response.data
  },
}
