'use client'

import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { WifiOff } from 'lucide-react'

/**
 * Offline Indicator Component
 *
 * Displays a banner when the user is offline.
 * Automatically hides when connection is restored.
 *
 * @example
 * ```tsx
 * <OfflineIndicator />
 * ```
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  if (isOnline) {
    return null
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-destructive px-4 py-3 text-destructive-foreground">
      <div className="container mx-auto flex items-center justify-center gap-2">
        <WifiOff className="h-4 w-4" />
        <p className="text-sm font-medium">
          You are currently offline. Some features may be unavailable.
        </p>
      </div>
    </div>
  )
}
