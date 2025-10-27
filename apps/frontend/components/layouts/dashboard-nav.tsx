'use client'

import Link from 'next/link'
import { useAuth } from '@/providers/auth.provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LogOut, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'

export function DashboardNav() {
  const { user, logout } = useAuth()
  const { t } = useI18n()

  return (
    <nav className="border-b bg-white dark:bg-gray-900 dark:border-gray-800">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold" prefetch>
            NoteFlow
          </Link>

          <div className="flex gap-6">
            <Link href="/dashboard" className="text-sm hover:text-primary transition-colors" prefetch>
              {t('common.navigation.dashboard')}
            </Link>
            <Link href="/veille" className="text-sm hover:text-primary transition-colors" prefetch>
              {t('common.navigation.veille')}
            </Link>
            <Link href="/summaries" className="text-sm hover:text-primary transition-colors" prefetch>
              {t('common.navigation.summaries')}
            </Link>
            <Link href="/notes" className="text-sm hover:text-primary transition-colors" prefetch>
              {t('common.navigation.notes')}
            </Link>
            <Link href="/pricing" className="text-sm hover:text-primary transition-colors" prefetch>
              {t('common.navigation.pricing')}
            </Link>
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className="text-sm hover:text-primary font-semibold text-red-600 transition-colors"
                prefetch
              >
                {t('common.navigation.admin')}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4" />
            <span>{user?.email}</span>
          </div>

          <LanguageSwitcher />
          <ThemeToggle />

          <Button variant="outline" size="sm" onClick={logout} data-testid="logout-button">
            <LogOut className="h-4 w-4 mr-2" />
            {t('common.navigation.logout')}
          </Button>
        </div>
      </div>
    </nav>
  )
}
