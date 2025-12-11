'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/providers/auth.provider'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import { LogOut, User } from 'lucide-react'
import { useI18n } from '@/lib/i18n/provider'
import { cn } from '@/lib/utils'

export function DashboardNav() {
  const { user, logout, isAuthenticated } = useAuth()
  const { t } = useI18n()
  const pathname = usePathname()

  const navLinks = [
    { href: '/dashboard', label: t('common.navigation.dashboard') },
    { href: '/veille', label: t('common.navigation.veille') },
    { href: '/summaries', label: t('common.navigation.summaries') },
    ...(isAuthenticated ? [{ href: '/templates', label: t('common.navigation.templates') }] : []),
    { href: '/notes', label: t('common.navigation.notes') },
    { href: '/pricing', label: t('common.navigation.pricing') },
    { href: '/contact', label: t('common.navigation.contact') },
    ...(isAuthenticated ? [{ href: '/settings', label: t('common.navigation.settings') }] : []),
  ]

  return (
    <nav className="sticky top-0 z-50 h-14 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-lg font-bold text-foreground" prefetch>
            NoteFlow
          </Link>

          <div className="hidden md:flex gap-6">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname?.startsWith(link.href + '/')
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'text-sm font-medium transition-colors duration-150 relative py-1',
                    isActive
                      ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                      : 'text-foreground hover:text-primary'
                  )}
                  prefetch
                >
                  {link.label}
                </Link>
              )
            })}
            {user?.role === 'ADMIN' && (
              <Link
                href="/admin"
                className={cn(
                  'text-sm font-semibold transition-colors duration-150 relative py-1',
                  pathname?.startsWith('/admin')
                    ? 'text-primary after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-primary'
                    : 'text-primary hover:text-primary/80'
                )}
                prefetch
              >
                {t('common.navigation.admin')}
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span className="max-w-[150px] truncate">{user?.email}</span>
              </div>

              <LanguageSwitcher />
              <ThemeToggle />

              <Button variant="outline" size="sm" onClick={logout} data-testid="nav-logout-button">
                <LogOut className="h-4 w-4 md:mr-2" />
                <span className="hidden md:inline">{t('common.navigation.logout')}</span>
              </Button>
            </>
          ) : (
            <>
              <LanguageSwitcher />
              <ThemeToggle />

              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">{t('common.navigation.login')}</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/register">{t('common.navigation.signup')}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
