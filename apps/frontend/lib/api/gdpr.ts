import { apiClient } from './client'

export type ExportDataResponse = {
  success: boolean
  message: string
  data: {
    user: Record<string, unknown>
    metadata: {
      exportedAt: string
      format: string
    }
    personalData: {
      articles?: unknown[]
      summaries?: unknown[]
      notes?: unknown[]
      subscription?: unknown
    }
  }
}

export type DeleteAccountDTO = {
  confirmEmail: string
  reason?: string
}

export type DeleteDataResponse = {
  success: boolean
  message: string
  data: {
    deletedAt: string
    deletedData: {
      user: boolean
      articles: number
      summaries: number
      notes: number
      subscription: boolean
    }
  }
}

export const gdprApi = {
  /**
   * Export all user data (GDPR Article 20 - Right to data portability)
   * Rate limited: 3 exports per hour
   */
  async exportData(): Promise<ExportDataResponse['data']> {
    const response = await apiClient.get<ExportDataResponse>('/api/gdpr/export-data')
    return response.data.data
  },

  /**
   * Delete user account and all data (GDPR Article 17 - Right to be forgotten)
   * Rate limited: 1 deletion per day
   * IRREVERSIBLE - deletes user and Stripe customer
   */
  async deleteAccount(data: DeleteAccountDTO): Promise<DeleteDataResponse['data']> {
    const response = await apiClient.delete<DeleteDataResponse>('/api/gdpr/delete-data', {
      data,
    })
    return response.data.data
  },
}
