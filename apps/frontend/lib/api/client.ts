import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { env } from '@/lib/env'
import { API_CONFIG } from '@/lib/constants/api'
import { logWarn, logError } from '@/lib/utils/logger'

// API URL from validated env (Zod ensures it's valid)
const API_URL = env.NEXT_PUBLIC_API_URL

/**
 * Axios client configured with interceptors
 * - Uses httpOnly cookies for tokens (XSS security)
 * - Handles token refresh if expired
 * - Centralizes errors
 */
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: API_CONFIG.TIMEOUT_MS,
  withCredentials: true, // Sends cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
})

// ========================================
// REQUEST INTERCEPTOR: Attach CSRF token for protection
// ========================================

// Cache CSRF token to avoid parsing cookies on every request
let cachedCsrfToken: string | null = null

/**
 * Clear the cached CSRF token
 * Call this after logout or when token is refreshed
 */
export function clearCsrfTokenCache(): void {
  cachedCsrfToken = null
}

apiClient.interceptors.request.use(
  config => {
    // Add CSRF token on all mutating requests (POST, PUT, PATCH, DELETE)
    const isMutatingRequest = ['post', 'put', 'patch', 'delete'].includes(
      config.method?.toLowerCase() || ''
    )

    if (isMutatingRequest && typeof document !== 'undefined') {
      // Use cached token or parse from cookie once
      if (!cachedCsrfToken) {
        cachedCsrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('csrfToken='))
          ?.split('=')[1] || null
      }

      if (cachedCsrfToken) {
        config.headers['X-CSRF-Token'] = cachedCsrfToken
      }
    }

    return config
  },
  error => Promise.reject(error)
)

// ========================================
// RESPONSE INTERCEPTOR: Refresh token with queue pattern (prevents race condition)
// ========================================
let isRefreshing = false
let refreshSubscribers: Array<() => void> = []
const MAX_REFRESH_ATTEMPTS = 3
const MAX_SUBSCRIBERS = 100 // Prevent memory leak

// SECURITY: Use in-memory variable instead of localStorage
// localStorage is vulnerable to manipulation via console.log
// In-memory counter resets on page reload (intended behavior for session rate limit)
let refreshAttempts = 0

// Periodic cleanup: Clear stale subscribers
if (typeof window !== 'undefined') {
  const cleanupInterval = setInterval(() => {
    if (refreshSubscribers.length > 0 && !isRefreshing) {
      logWarn('Cleaning up stale refresh subscribers', {
        count: refreshSubscribers.length,
      })
      refreshSubscribers = []
    }
  }, API_CONFIG.TOKEN_REFRESH.SUBSCRIBER_CLEANUP_INTERVAL_MS)

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    clearInterval(cleanupInterval)
  })
}

// In-memory refresh attempt helpers (not accessible via localStorage)
const getRefreshAttempts = (): number => {
  return refreshAttempts
}

const incrementRefreshAttempts = (): number => {
  refreshAttempts += 1
  return refreshAttempts
}

const resetRefreshAttempts = (): void => {
  refreshAttempts = 0
}

const onRefreshed = () => {
  refreshSubscribers.forEach(callback => callback())
  refreshSubscribers = []
}

const addRefreshSubscriber = (callback: () => void) => {
  if (refreshSubscribers.length >= MAX_SUBSCRIBERS) {
    logError(
      new Error('Too many refresh subscribers - clearing queue'),
      'TokenRefresh'
    )
    refreshSubscribers = []
  }
  refreshSubscribers.push(callback)
}

apiClient.interceptors.response.use(
  response => {
    // ✅ Reset refresh attempts on successful response
    resetRefreshAttempts()
    return response
  },
  async (error: AxiosError) => {
    const originalRequest = error.config

    // If 401 and not already refreshing
    if (error.response?.status === 401 && originalRequest && !isRefreshing) {
      // Avoid infinite loop on /refresh, /login, /register
      if (
        originalRequest.url?.includes('/auth/refresh') ||
        originalRequest.url?.includes('/auth/login') ||
        originalRequest.url?.includes('/auth/register')
      ) {
        // Redirect to login if refresh fails
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.includes('/login')
        ) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      // Allow refresh for /auth/me (auto-reconnect scenario)
      // Note: We can't check refreshToken existence via document.cookie (httpOnly)
      // So we always attempt refresh and let the backend determine if token is valid

      // Check if max attempts reached
      const currentAttempts = getRefreshAttempts()
      if (currentAttempts >= MAX_REFRESH_ATTEMPTS) {
        logError(
          new Error('Max refresh attempts reached'),
          'TokenRefresh'
        )
        resetRefreshAttempts() // Reset for next session
        if (
          typeof window !== 'undefined' &&
          !window.location.pathname.includes('/login')
        ) {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }

      if (!isRefreshing) {
        isRefreshing = true
        incrementRefreshAttempts()

        try {
          // Call refresh endpoint (token sent automatically via cookies)
          await axios.post(
            `${API_URL}/api/auth/refresh`,
            {},
            { withCredentials: true }
          )

          // Token refreshed successfully
          isRefreshing = false
          resetRefreshAttempts() // ✅ Reset on success
          onRefreshed()

          // Retry original request
          return apiClient(originalRequest)
        } catch (refreshError: unknown) {
          // Refresh failed
          isRefreshing = false

          // Convert to Error if needed
          const err = refreshError instanceof Error
            ? refreshError
            : new Error('Token refresh failed')

          // If we've exhausted attempts, redirect
          const attempts = getRefreshAttempts()
          if (attempts >= MAX_REFRESH_ATTEMPTS) {
            resetRefreshAttempts()
            if (
              typeof window !== 'undefined' &&
              !window.location.pathname.includes('/login')
            ) {
              window.location.href = '/login'
            }
          }

          return Promise.reject(err)
        }
      }

      // If already refreshing, wait for it to finish
      return new Promise(resolve => {
        addRefreshSubscriber(() => {
          resolve(apiClient(originalRequest))
        })
      })
    }

    return Promise.reject(error)
  }
)
