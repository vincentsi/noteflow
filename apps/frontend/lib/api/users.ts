import { apiClient } from './client'

export type UserStats = {
  articles: {
    current: number
    limit: number | null
  }
  summaries: {
    current: number
    limit: number | null
  }
  notes: {
    current: number
    limit: number | null
  }
}

export type UserStatsResponse = {
  success: boolean
  data: {
    stats: UserStats
  }
}

export const usersApi = {
  async getStats(): Promise<UserStats> {
    const response = await apiClient.get<UserStatsResponse>('/users/stats')
    return response.data.data.stats
  },
}
