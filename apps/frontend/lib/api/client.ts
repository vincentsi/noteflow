import axios, { type AxiosError, type AxiosInstance } from 'axios'
import { env } from '@/lib/env'

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
  timeout: 10000, // 10s timeout
  withCredentials: true, // Sends cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
})

// ========================================
// REQUEST INTERCEPTOR: Attach CSRF token for protection
// ========================================
apiClient.interceptors.request.use(
  config => {
    // Add CSRF token on all mutating requests (POST, PUT, PATCH, DELETE)
    const isMutatingRequest = ['post', 'put', 'patch', 'delete'].includes(
      config.method?.toLowerCase() || ''
    )

    if (isMutatingRequest && typeof document !== 'undefined') {
      // Get token from csrfToken cookie
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrfToken='))
        ?.split('=')[1]

      if (csrfToken) {
        config.headers['X-CSRF-Token'] = csrfToken
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

// Periodic cleanup: Clear stale subscribers every 30 seconds
if (typeof window !== 'undefined') {
  setInterval(() => {
    if (refreshSubscribers.length > 0 && !isRefreshing) {
      console.warn(
        `⚠️ Cleaning up ${refreshSubscribers.length} stale refresh subscribers`
      )
      refreshSubscribers = []
    }
  }, 30000) // 30 seconds
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
    console.error('⚠️ Too many refresh subscribers - clearing queue')
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
        console.error(
          '❌ Max refresh attempts reached. Redirecting to login...'
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
        } catch {
          // Refresh failed
          isRefreshing = false

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

          return Promise.reject(error)
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
