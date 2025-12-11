'use client'

import { useAuth } from '@/providers/auth.provider'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { useUserStats } from '@/lib/hooks/useUserStats'
import { useI18n } from '@/lib/i18n/provider'
import { Rss, Sparkles, FileText, ArrowRight, Mail, Settings } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()
  const { data: stats, isLoading } = useUserStats()
  const { t } = useI18n()

  const quickActions = [
    {
      title: 'Veille IA',
      description: 'Browse and save articles from RSS feeds',
      icon: Rss,
      href: '/veille',
      color: 'text-foreground'
    },
    {
      title: t('common.navigation.summaries'),
      description: 'Generate AI summaries in 6 styles',
      icon: Sparkles,
      href: '/summaries',
      color: 'text-foreground'
    },
    {
      title: t('common.navigation.notes'),
      description: 'Write and organize markdown notes',
      icon: FileText,
      href: '/notes',
      color: 'text-foreground'
    },
    {
      title: t('common.navigation.contact'),
      description: 'Get in touch with our team',
      icon: Mail,
      href: '/contact',
      color: 'text-foreground'
    },
    {
      title: t('common.navigation.settings'),
      description: 'Manage your account settings',
      icon: Settings,
      href: '/settings',
      color: 'text-foreground'
    }
  ]

  // Show login prompt for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {t('dashboard.title')}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            {t('dashboard.loginPrompt')}
          </p>
        </div>

        {/* Login Prompt Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-foreground">
                  {t('dashboard.loginPromptTitle')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-md">
                  {t('dashboard.loginPromptDescription')}
                </p>
              </div>
              <div className="flex gap-3">
                <Button onClick={() => router.push('/login')}>
                  {t('common.navigation.login')}
                </Button>
                <Button variant="outline" onClick={() => router.push('/register')}>
                  {t('common.navigation.signup')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions - Show preview */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <Link key={action.title} href={action.href}>
                  <Card className="group cursor-pointer">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <Icon className={`h-5 w-5 ${action.color}`} />
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <CardTitle className="text-lg">{action.title}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight" data-testid="dashboard-title">
          {t('dashboard.title')}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t('dashboard.welcome', { name: user?.name || user?.email || '' })}
        </p>
      </div>

      {/* Plan Usage Card */}
      {stats && !isLoading && (
        <PlanUsageCard stats={stats} plan={user?.planType} />
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link key={action.title} href={action.href}>
                <Card className="group cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Icon className={`h-5 w-5 ${action.color}`} />
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <CardTitle className="text-lg">{action.title}</CardTitle>
                    <CardDescription>{action.description}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Account Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userInfo.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="font-medium text-foreground">{t('dashboard.userInfo.email')}</dt>
                <dd className="text-muted-foreground mt-1">{user?.email}</dd>
              </div>
              <div>
                <dt className="font-medium text-foreground">{t('dashboard.userInfo.plan')}</dt>
                <dd className="mt-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-foreground text-background" data-testid="user-plan-type">
                    {user?.planType || 'FREE'}
                  </span>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.subscription.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Display subscription end date for paid plans */}
            {user?.planType !== 'FREE' && user?.currentPeriodEnd ? (
              <div className="p-3 bg-muted rounded-md border border-border">
                <div className="text-sm space-y-1">
                  {(() => {
                    const endDate = new Date(user.currentPeriodEnd)
                    const today = new Date()
                    const daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                    return (
                      <>
                        <p className="font-medium text-foreground">
                          {t('dashboard.planUsage.daysRemaining', { count: daysRemaining, days: daysRemaining })}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {t('dashboard.planUsage.renewsOn', {
                            date: endDate.toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })
                          })}
                        </p>
                      </>
                    )
                  })()}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {t('dashboard.subscription.currentPlan', { plan: user?.planType || 'FREE' })}
                </p>
                {user?.currentPeriodEnd && user?.planType !== 'FREE' && (
                  <p className="text-xs text-muted-foreground">
                    {t('dashboard.planUsage.renewsOn', {
                      date: new Date(user.currentPeriodEnd).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    })}
                  </p>
                )}
              </div>
            )}

            <Button
              onClick={() => router.push('/pricing')}
              variant={user?.planType === 'FREE' ? 'default' : 'outline'}
              className="w-full"
            >
              {user?.planType === 'FREE' ? t('dashboard.subscription.upgradePlan') : t('dashboard.subscription.manageSubscription')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
