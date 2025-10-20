import { apiClient } from './client'
import type { User } from '@/types'

export type RegisterDTO = {
  email: string
  password: string
  name?: string
}

export type LoginDTO = {
  email: string
  password: string
}

export type AuthResponse = {
  user: User
}

export type ForgotPasswordDTO = {
  email: string
}

export type ResetPasswordDTO = {
  token: string
  newPassword: string
}

/**
 * Authentication API with strict types
 * Tokens are stored in httpOnly cookies by backend
 */
export const authApi = {
  /**
   * Create a new account
   */
  register: async (data: RegisterDTO): Promise<AuthResponse> => {
    const response = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      '/api/auth/register',
      data
    )
    return response.data.data
  },

  /**
   * Login
   */
  login: async (data: LoginDTO): Promise<AuthResponse> => {
    const response = await apiClient.post<{ success: boolean; data: AuthResponse }>(
      '/api/auth/login',
      data
    )
    return response.data.data
  },

  /**
   * Get current user
   */
  me: async (): Promise<{ user: User }> => {
    const response = await apiClient.get<{ success: boolean; data: { user: User } }>(
      '/api/auth/me'
    )
    return response.data.data
  },

  /**
   * Logout and revoke tokens
   */
  logout: async (): Promise<void> => {
    await apiClient.post('/api/auth/logout')
  },

  /**
   * Refresh access token using refresh token cookie
   */
  refresh: async (): Promise<void> => {
    await apiClient.post('/api/auth/refresh', {})
  },

  /**
   * Request password reset email
   */
  forgotPassword: async (data: ForgotPasswordDTO): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/forgot-password',
      data
    )
    return response.data
  },

  /**
   * Reset password with token
   */
  resetPassword: async (data: ResetPasswordDTO): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.post<{ success: boolean; message: string }>(
      '/api/auth/reset-password',
      data
    )
    return response.data
  },
}
