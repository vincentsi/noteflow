'use client'

import { useEffect, useState } from 'react'

/**
 * Hook to detect online/offline status
 *
 * Monitors browser's online status and provides real-time updates.
 * Useful for showing offline indicators or disabling features.
 *
 * @returns {boolean} Current online status
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const isOnline = useOnlineStatus()
 *
 *   if (!isOnline) {
 *     return <div>You are offline</div>
 *   }
 *
 *   return <div>Content...</div>
 * }
 * ```
 */
export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true)

  useEffect(() => {
    // Initialize with current status
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true)

    // Event handlers
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    // Listen to online/offline events
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}
