import { apiClient } from './client'
import { buildPaginationUrl, type PaginationParams } from '@/lib/utils/pagination'

export type AdminUser = {
  id: string
  email: string
  name: string | null
  role: 'USER' | 'ADMIN' | 'MODERATOR'
  emailVerified: boolean
  createdAt: string
  updatedAt: string
}

export type AdminSubscription = {
  id: string
  stripeSubscriptionId: string
  stripePriceId: string
  status: string
  planType: string
  currentPeriodStart: string
  currentPeriodEnd: string
  cancelAtPeriodEnd: boolean
  canceledAt: string | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  }
}

export type AdminStats = {
  totalUsers: number
  verifiedUsers: number
  unverifiedUsers: number
  byRole: Array<{
    role: string
    _count: number
  }>
}

// Re-export PaginationParams for backward compatibility
export type { PaginationParams }

export type PaginatedResponse<T> = {
  success: boolean
  data: {
    items: T[]
    pagination: {
      page: number
      limit: number
      totalCount: number
      totalPages: number
      hasNextPage: boolean
      hasPreviousPage: boolean
    }
  }
}

/**
 * Admin API - Requires ADMIN role
 */
export const adminApi = {
  /**
   * Get admin statistics
   */
  getStats: async (): Promise<AdminStats> => {
    const response = await apiClient.get<{ success: boolean; data: AdminStats }>(
      '/api/admin/stats'
    )
    return response.data.data
  },

  /**
   * List all users with pagination
   */
  listUsers: async (params?: PaginationParams): Promise<PaginatedResponse<AdminUser>> => {
    const url = buildPaginationUrl('/api/admin/users', params)
    const response = await apiClient.get<{
      success: boolean
      data: {
        users: AdminUser[]
        pagination: PaginatedResponse<AdminUser>['data']['pagination']
      }
    }>(url)

    // Transform backend response to match PaginatedResponse format
    return {
      success: response.data.success,
      data: {
        items: response.data.data.users,
        pagination: response.data.data.pagination,
      },
    }
  },

  /**
   * List all subscriptions with pagination
   */
  listSubscriptions: async (
    params?: PaginationParams
  ): Promise<PaginatedResponse<AdminSubscription>> => {
    const url = buildPaginationUrl('/api/admin/subscriptions', params)
    const response = await apiClient.get<{
      success: boolean
      data: {
        subscriptions: AdminSubscription[]
        pagination: PaginatedResponse<AdminSubscription>['data']['pagination']
      }
    }>(url)

    return {
      success: response.data.success,
      data: {
        items: response.data.data.subscriptions,
        pagination: response.data.data.pagination,
      },
    }
  },

  /**
   * Update user role
   */
  updateUserRole: async (
    userId: string,
    role: 'USER' | 'ADMIN' | 'MODERATOR'
  ): Promise<void> => {
    await apiClient.patch(`/api/admin/users/${userId}/role`, { role })
  },

  /**
   * Delete user
   */
  deleteUser: async (userId: string): Promise<void> => {
    await apiClient.delete(`/api/admin/users/${userId}`)
  },

  /**
   * Trigger manual token cleanup
   */
  cleanupTokens: async (): Promise<void> => {
    await apiClient.post('/api/admin/cleanup-tokens')
  },

  /**
   * Create manual backup
   */
  createBackup: async (): Promise<{ backupPath: string }> => {
    const response = await apiClient.post<{
      success: boolean
      data: { backupPath: string }
    }>('/api/admin/backup')
    return response.data.data
  },

  /**
   * List all backups
   */
  listBackups: async (): Promise<{
    backups: string[]
    stats: { totalBackups: number; totalSize: string }
  }> => {
    const response = await apiClient.get<{
      success: boolean
      data: {
        backups: string[]
        stats: { totalBackups: number; totalSize: string }
      }
    }>('/api/admin/backups')
    return response.data.data
  },
}
