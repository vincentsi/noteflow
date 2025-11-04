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

/**
 * @deprecated Legacy function - no longer needed
 */
export function clearCsrfTokenCache(): void {
  // No-op for backward compatibility
}

apiClient.interceptors.request.use(
  config => {
    // CSRF token is handled by backend via httpOnly cookie
    // No client-side token management needed
    return config
  },
  error => Promise.reject(error)
)

// ========================================
// RESPONSE INTERCEPTOR: Refresh token with queue pattern (prevents race condition)
// ========================================

// Cross-tab synchronization constants
const REFRESH_LOCK_KEY = 'auth:refreshing'
const REFRESH_LOCK_TIMEOUT_MS = 10000 // 10 seconds

// In-tab state
let isRefreshing = false
let refreshSubscribers: Array<() => void> = []
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

/**
 * Check if another tab is currently refreshing the token
 * Uses localStorage for cross-tab communication
 */
function isAnotherTabRefreshing(): boolean {
  if (typeof window === 'undefined') return false

  const lockValue = localStorage.getItem(REFRESH_LOCK_KEY)
  if (!lockValue) return false

  const lockTime = parseInt(lockValue, 10)
  if (isNaN(lockTime)) return false

  // Check if lock is still valid (not expired)
  return Date.now() - lockTime < REFRESH_LOCK_TIMEOUT_MS
}

/**
 * Acquire refresh lock (cross-tab)
 * Returns true if lock was acquired, false if another tab has it
 */
function acquireRefreshLock(): boolean {
  if (typeof window === 'undefined') return true

  // Check if another tab already has the lock
  if (isAnotherTabRefreshing()) {
    return false
  }

  // Acquire lock
  localStorage.setItem(REFRESH_LOCK_KEY, Date.now().toString())
  return true
}

/**
 * Release refresh lock (cross-tab)
 */
function releaseRefreshLock(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(REFRESH_LOCK_KEY)
}

/**
 * Check if a token refresh is currently in progress
 * Used by AuthProvider to avoid race conditions with proactive refresh
 */
export function isRefreshingToken(): boolean {
  return isRefreshing
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
      if (currentAttempts >= API_CONFIG.MAX_REFRESH_ATTEMPTS) {
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
        // Try to acquire cross-tab lock
        const lockAcquired = acquireRefreshLock()

        if (!lockAcquired) {
          // Another tab is refreshing, wait for it to complete
          logWarn('Another tab is refreshing token, waiting...', {})

          // Wait a bit and retry the request (token should be refreshed by other tab)
          await new Promise(resolve => setTimeout(resolve, 1000))

          // Retry original request with (hopefully) refreshed token
          return apiClient(originalRequest)
        }

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
          releaseRefreshLock() // Release cross-tab lock
          resetRefreshAttempts() // ✅ Reset on success
          onRefreshed()

          // Retry original request
          return apiClient(originalRequest)
        } catch (refreshError: unknown) {
          // Refresh failed
          isRefreshing = false
          releaseRefreshLock() // Release cross-tab lock

          // Convert to Error if needed
          const err = refreshError instanceof Error
            ? refreshError
            : new Error('Token refresh failed')

          // If we've exhausted attempts, redirect
          const attempts = getRefreshAttempts()
          if (attempts >= API_CONFIG.MAX_REFRESH_ATTEMPTS) {
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
