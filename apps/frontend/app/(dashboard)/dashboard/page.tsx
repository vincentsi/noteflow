'use client'

import { useAuth } from '@/providers/auth.provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { PlanUsageCard } from '@/components/dashboard/PlanUsageCard'
import { useUserStats } from '@/lib/hooks/useUserStats'
import { useI18n } from '@/lib/i18n/provider'

export default function DashboardPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const { data: stats, isLoading } = useUserStats()
  const { t } = useI18n()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold dark:text-white" data-testid="dashboard-title">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            {t('dashboard.welcome', { name: user?.name || user?.email || '' })}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline" data-testid="dashboard-logout-button">
          {t('common.navigation.logout')}
        </Button>
      </div>

      {/* Plan Usage Card */}
      {stats && !isLoading && (
        <PlanUsageCard stats={stats} plan={user?.planType} />
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.userInfo.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium dark:text-gray-200">{t('dashboard.userInfo.email')}</dt>
                <dd className="text-muted-foreground dark:text-gray-400">{user?.email}</dd>
              </div>
              <div>
                <dt className="font-medium dark:text-gray-200">{t('dashboard.userInfo.plan')}</dt>
                <dd className="text-muted-foreground dark:text-gray-400 font-semibold" data-testid="user-plan-type">
                  {user?.planType || 'FREE'}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('dashboard.subscription.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground dark:text-gray-400 mb-4">
              {t('dashboard.subscription.currentPlan', { plan: user?.planType || 'FREE' })}
            </p>

            {/* Display subscription end date and days remaining for paid plans */}
            {user?.planType !== 'FREE' && user?.currentPeriodEnd && (
              <div className="mb-4 p-3 bg-muted rounded-lg">
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
            )}

            <Button
              onClick={() => router.push('/pricing')}
              variant="outline"
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
