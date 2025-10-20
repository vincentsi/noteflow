'use client'

import { useAuth } from '@/providers/auth.provider'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/**
 * AdminRoute HOC - Protects routes for ADMIN users only
 * Redirects to dashboard if user is not admin
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'ADMIN')) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  // Don't render if not admin
  if (!user || user.role !== 'ADMIN') {
    return null
  }

  return <>{children}</>
}
