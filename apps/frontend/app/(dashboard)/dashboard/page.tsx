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
          <h1 className="text-3xl font-bold dark:text-white">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground dark:text-gray-400">
            {t('dashboard.welcome', { name: user?.name || user?.email || '' })}
          </p>
        </div>
        <Button onClick={handleLogout} variant="outline">
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
                <dd className="text-muted-foreground dark:text-gray-400 font-semibold">
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
