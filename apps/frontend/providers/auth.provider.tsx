'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi, type LoginDTO, type RegisterDTO } from '@/lib/api/auth'
import { isRefreshingToken } from '@/lib/api/client'
import type { User } from '@/types'

type AuthContextType = {
  user: User | null
  login: (data: LoginDTO) => Promise<void>
  register: (data: RegisterDTO) => Promise<void>
  logout: () => void
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  // Query to fetch current user
  const { data, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const response = await authApi.me()
        return response.user
      } catch {
        return null
      }
    },
    enabled: isInitialized,
    staleTime: 5 * 60 * 1000, // 5 minutes for user data
  })

  useEffect(() => {
    setIsInitialized(true)
  }, [])

  // Proactive token refresh every 10 minutes (before 15 min expiration)
  useEffect(() => {
    if (!data) return

    const refreshInterval = setInterval(
      async () => {
        try {
          // Skip if a refresh is already in progress (avoid race condition)
          if (isRefreshingToken()) {
            return
          }

          await authApi.refresh()
          queryClient.invalidateQueries({ queryKey: ['me'] })
        } catch (error) {
          console.error('Failed to refresh token:', error)
        }
      },
      10 * 60 * 1000
    ) // 10 minutes

    return () => clearInterval(refreshInterval)
  }, [data, queryClient])

  // Mutation for login
  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      // Tokens stored in httpOnly cookies by backend
      queryClient.setQueryData(['me'], data.user)
      router.push('/dashboard')
    },
  })

  // Mutation for register
  const registerMutation = useMutation({
    mutationFn: authApi.register,
    onSuccess: (data) => {
      // Tokens stored in httpOnly cookies by backend
      queryClient.setQueryData(['me'], data.user)
      router.push('/dashboard')
    },
  })

  const logout = async () => {
    try {
      // Call backend logout to revoke tokens
      await authApi.logout()
    } catch {
      // Ignore logout errors
    }
    queryClient.setQueryData(['me'], null)
    queryClient.clear()
    router.push('/login')
  }

  const value: AuthContextType = {
    user: data ?? null,
    login: async (credentials) => {
      await loginMutation.mutateAsync(credentials)
    },
    register: async (data) => {
      await registerMutation.mutateAsync(data)
    },
    logout,
    isLoading: !isInitialized || isLoading,
    isAuthenticated: !!data,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
