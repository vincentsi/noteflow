'use client'

import Link from 'next/link'
import { useAuth } from '@/providers/auth.provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LogOut, User } from 'lucide-react'

export function DashboardNav() {
  const { user, logout } = useAuth()

  return (
    <nav className="border-b bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold" prefetch>
            Boilerplate
          </Link>

          <div className="flex gap-4">
            <Link href="/dashboard" className="text-sm hover:text-primary" prefetch>
              Dashboard
            </Link>
            <Link href="/profile" className="text-sm hover:text-primary" prefetch>
              Profile
            </Link>
            <Link href="/pricing" className="text-sm hover:text-primary" prefetch>
              Pricing
            </Link>
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="text-sm hover:text-primary font-semibold text-red-600"
                prefetch
              >
                Admin Panel
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>

          <ThemeToggle />

          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>
    </nav>
  )
}
